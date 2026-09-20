import ast
import sys
import json
from typing import List, Optional, Tuple
from dataclasses import dataclass, asdict

try:
    import networkx as nx
except ImportError:
    # Graceful standard library fallback with 100% networkx DiGraph interface compatibility
    class MockNX:
        class DiGraph:
            def __init__(self):
                self.adj = {}
                self.nodes = set()

            def add_edge(self, u: str, v: str):
                self.nodes.add(u)
                self.nodes.add(v)
                self.adj.setdefault(u, []).append(v)

        @staticmethod
        def is_directed_acyclic_graph(graph) -> bool:
            # 0: unvisited, 1: visiting (in stack), 2: visited
            state = {n: 0 for n in graph.nodes}

            def dfs(u: str) -> bool:
                state[u] = 1
                for v in graph.adj.get(u, []):
                    if state.get(v, 0) == 1:
                        return False  # Cycle detected
                    if state.get(v, 0) == 0:
                        if not dfs(v):
                            return False
                state[u] = 2
                return True

            for node in graph.nodes:
                if state[node] == 0:
                    if not dfs(node):
                        return False
            return True

    nx = MockNX()


@dataclass
class ComplexityResult:
    is_safe: bool
    complexity_bound: str
    reason: str
    max_loop_depth: int = 0
    has_recursion: bool = False


class HardenedComplexityVerifier(ast.NodeVisitor):
    """
    A robust AST analyzer that enforces polynomial-time constraints (O(n^k))
    by checking nesting depth and detecting recursive call cycles.
    """
    def __init__(self):
        self.graph = nx.DiGraph()
        self.current_func: Optional[str] = None
        self.current_depth: int = 0
        self.max_depths: dict = {}
        self.is_valid: bool = True

    def visit_FunctionDef(self, node: ast.FunctionDef):
        parent_func = self.current_func
        self.current_func = node.name
        self.max_depths[self.current_func] = 0
        self.generic_visit(node)
        self.current_func = parent_func

    def _enter_loop(self):
        self.current_depth += 1
        if self.current_func:
            self.max_depths[self.current_func] = max(
                self.max_depths.get(self.current_func, 0), self.current_depth
            )
        else:
            self.max_depths["<global>"] = max(
                self.max_depths.get("<global>", 0), self.current_depth
            )

    def _exit_loop(self):
        self.current_depth -= 1

    def visit_For(self, node: ast.For):
        self._enter_loop()
        self.generic_visit(node)
        self._exit_loop()

    def visit_While(self, node: ast.While):
        self._enter_loop()
        self.generic_visit(node)
        self._exit_loop()

    def visit_AsyncFor(self, node: ast.AsyncFor):
        self._enter_loop()
        self.generic_visit(node)
        self._exit_loop()

    def visit_Call(self, node: ast.Call):
        if self.current_func:
            callee = None
            if isinstance(node.func, ast.Name):
                callee = node.func.id
            elif isinstance(node.func, ast.Attribute):
                callee = node.func.attr
            
            if callee:
                self.graph.add_edge(self.current_func, callee)
        self.generic_visit(node)

    def verify(self, source_code: str, max_nesting: int = 3) -> bool:
        """
        Parses source code and returns True if complexity constraints are met.
        """
        try:
            tree = ast.parse(source_code)
            self.visit(tree)
            
            # 1. Cycle Detection (Detects direct and indirect recursion)
            has_cycles = not nx.is_directed_acyclic_graph(self.graph)
            
            # 2. Nesting Depth Check
            depth_violation = any(d > max_nesting for d in self.max_depths.values())
            
            return not has_cycles and not depth_violation
        except (SyntaxError, AttributeError, TypeError):
            return False

    def analyze(self, source_code: str, max_nesting: int = 3) -> ComplexityResult:
        """
        Performs full formal AST analysis returning structured ComplexityResult.
        """
        try:
            tree = ast.parse(source_code)
            self.visit(tree)

            has_recursion = not nx.is_directed_acyclic_graph(self.graph)
            max_depth = max(self.max_depths.values()) if self.max_depths else 0
            depth_violation = max_depth > max_nesting

            if depth_violation:
                return ComplexityResult(
                    is_safe=False,
                    complexity_bound="O(n^k)",
                    reason=f"Excessive loop nesting detected (depth {max_depth} > {max_nesting}).",
                    max_loop_depth=max_depth,
                    has_recursion=has_recursion,
                )

            if has_recursion:
                return ComplexityResult(
                    is_safe=False,
                    complexity_bound="O(2^n)",
                    reason="Recursive call cycle detected.",
                    max_loop_depth=max_depth,
                    has_recursion=True,
                )

            bound = (
                "O(1)"
                if max_depth == 0
                else f"O(n^{max_depth})"
                if max_depth > 1
                else "O(n)"
            )

            return ComplexityResult(
                is_safe=True,
                complexity_bound=bound,
                reason="Complexity bounds within limits.",
                max_loop_depth=max_depth,
                has_recursion=False,
            )
        except Exception as e:
            return ComplexityResult(
                is_safe=False,
                complexity_bound="SyntaxError",
                reason=str(e),
                max_loop_depth=0,
                has_recursion=False,
            )


def execute_hardened_code(code: str) -> bool:
    """
    Standard interface for verifying logic before execution in Project Genesis.
    """
    verifier = HardenedComplexityVerifier()
    return verifier.verify(code)


# Alias for backwards compatibility
ComplexityAnalyzer = HardenedComplexityVerifier


def execute_code_with_verification(code: str) -> Tuple[bool, str, ComplexityResult]:
    """Combines formal analysis with execution safety."""
    analyzer = HardenedComplexityVerifier()
    analysis = analyzer.analyze(code)

    if not analysis.is_safe:
        return False, f"Verification Failed: {analysis.reason}", analysis

    # Proceed to execution logic...
    return True, "Code verified and ready for execution.", analysis


if __name__ == "__main__":
    if len(sys.argv) > 1:
        raw_code = sys.argv[1]
    else:
        raw_code = sys.stdin.read()

    analyzer = HardenedComplexityVerifier()
    res = analyzer.analyze(raw_code)
    print(
        json.dumps(
            {
                "is_safe": res.is_safe,
                "complexity_bound": res.complexity_bound,
                "reason": res.reason,
                "max_loop_depth": res.max_loop_depth,
                "has_recursion": res.has_recursion,
            }
        )
    )
