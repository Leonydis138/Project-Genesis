"""
Lightweight NetworkX-compatible fallback module providing DiGraph and cycle detection.
Enables AST call graph cycle analysis without external package dependencies.
"""
from typing import Dict, List, Set, Any, Optional

class DiGraph:
    def __init__(self):
        self.adj: Dict[str, List[str]] = {}
        self.nodes: Set[str] = set()

    def add_node(self, node: str):
        self.nodes.add(node)
        if node not in self.adj:
            self.adj[node] = []

    def add_edge(self, u: str, v: str, **kwargs):
        self.nodes.add(u)
        self.nodes.add(v)
        if u not in self.adj:
            self.adj[u] = []
        if v not in self.adj:
            self.adj[v] = []
        if v not in self.adj[u]:
            self.adj[u].append(v)

    def neighbors(self, node: str) -> List[str]:
        return self.adj.get(node, [])

    def __contains__(self, node: str) -> bool:
        return node in self.nodes

    def number_of_nodes(self) -> int:
        return len(self.nodes)

    def number_of_edges(self) -> int:
        return sum(len(neighbors) for neighbors in self.adj.values())


def is_directed_acyclic_graph(G: DiGraph) -> bool:
    """
    Returns True if graph G is a directed acyclic graph (DAG), False if it contains cycles.
    Uses three-color depth-first search (0 = unvisited, 1 = visiting, 2 = visited).
    """
    state: Dict[str, int] = {n: 0 for n in G.nodes}

    def dfs(u: str) -> bool:
        state[u] = 1  # visiting
        for v in G.adj.get(u, []):
            if state.get(v, 0) == 1:
                return False  # Back-edge found -> cycle detected
            if state.get(v, 0) == 0:
                if not dfs(v):
                    return False
        state[u] = 2  # visited
        return True

    for node in G.nodes:
        if state[node] == 0:
            if not dfs(node):
                return False
    return True
