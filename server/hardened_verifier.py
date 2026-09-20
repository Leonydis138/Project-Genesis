import ast
import networkx as nx
from typing import Optional, List, Union, Dict, Any
import json
import sys

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
            # Track top-level script loop nesting
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

    def detailed_analysis(self, source_code: str, max_nesting: int = 3) -> Dict[str, Any]:
        """
        Provides detailed breakdown including detected cycles and loop depths.
        """
        try:
            tree = ast.parse(source_code)
            self.visit(tree)

            has_cycles = not nx.is_directed_acyclic_graph(self.graph)
            max_depth = max(self.max_depths.values()) if self.max_depths else 0
            depth_violation = max_depth > max_nesting

            is_safe = not has_cycles and not depth_violation

            if depth_violation:
                bound = "O(n^k)"
                reason = f"Excessive loop nesting detected (depth {max_depth} > max {max_nesting})."
            elif has_cycles:
                bound = "O(2^n)"
                reason = "Recursive call cycle detected."
            else:
                bound = "O(1)" if max_depth == 0 else f"O(n^{max_depth})" if max_depth > 1 else "O(n)"
                reason = "Complexity constraints satisfied (polynomial bound enforced)."

            return {
                "is_safe": is_safe,
                "complexity_bound": bound,
                "reason": reason,
                "max_loop_depth": max_depth,
                "has_recursion": has_cycles,
                "call_graph_edges": [
                    {"caller": u, "callee": v}
                    for u in self.graph.nodes
                    for v in self.graph.adj.get(u, [])
                ],
                "function_loop_depths": self.max_depths
            }
        except Exception as e:
            return {
                "is_safe": False,
                "complexity_bound": "SyntaxError",
                "reason": f"AST parsing failed: {str(e)}",
                "max_loop_depth": 0,
                "has_recursion": False,
                "call_graph_edges": [],
                "function_loop_depths": {}
            }


def execute_hardened_code(code: str) -> bool:
    """
    Standard interface for verifying logic before execution in Project Genesis.
    """
    verifier = HardenedComplexityVerifier()
    return verifier.verify(code)


if __name__ == "__main__":
    raw_code = sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read()
    verifier = HardenedComplexityVerifier()
    analysis = verifier.detailed_analysis(raw_code)
    print(json.dumps(analysis))
