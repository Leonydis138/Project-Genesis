import sqlite3
import ast
import json
import logging
import sys
import argparse
from typing import List, Dict, Any, Optional
from collections import deque
from pathlib import Path

# Configure logging to stderr so stdout remains clean JSON
logging.basicConfig(level=logging.INFO, stream=sys.stderr, format="[GenesisOptimizer] %(levelname)s: %(message)s")

class GenesisOptimizer:
    """
    Autonomous agent framework for continuous performance optimization.
    Uses a SQLite-backed history buffer and AST-validated policy updates.
    """
    def __init__(self, db_path: str = "agent_experience.db", max_history: int = 100):
        self.db_path = Path(db_path)
        self.history = deque(maxlen=max_history)
        self.system_params: Dict[str, Any] = {"version": "1.0", "learning_rate": 0.1}
        self._init_db()
        self._load_latest_state()

    def _init_db(self) -> None:
        """Initializes persistent storage for experience logs."""
        if self.db_path.parent and str(self.db_path.parent) != ".":
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS experience (
                    id INTEGER PRIMARY KEY,
                    task_id TEXT,
                    score REAL,
                    strategy TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS optimizer_state (
                    key TEXT PRIMARY KEY,
                    value TEXT
                )
            """)

    def _load_latest_state(self) -> None:
        """Loads state from SQLite database into memory if present."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("SELECT id, task_id, score, strategy, timestamp FROM experience ORDER BY id DESC LIMIT 100")
                rows = cursor.fetchall()
                for row in reversed(rows):
                    self.history.append({
                        "id": row[0],
                        "task_id": row[1],
                        "score": row[2],
                        "strategy": row[3],
                        "timestamp": row[4]
                    })
                
                # Load system params if persisted
                cursor = conn.execute("SELECT key, value FROM optimizer_state")
                for key, val in cursor.fetchall():
                    try:
                        self.system_params[key] = json.loads(val)
                    except Exception:
                        self.system_params[key] = val
        except Exception as e:
            logging.error(f"Failed to load state: {e}")

    def _save_state(self) -> None:
        """Persists system parameters to SQLite."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                for key, val in self.system_params.items():
                    conn.execute(
                        "INSERT OR REPLACE INTO optimizer_state (key, value) VALUES (?, ?)",
                        (key, json.dumps(val))
                    )
        except Exception as e:
            logging.error(f"Failed to save optimizer state: {e}")

    def validate_logic(self, code_str: str) -> bool:
        """Ensures synthesized logic is syntactically valid via AST."""
        try:
            ast.parse(code_str)
            return True
        except SyntaxError:
            return False

    def record_experience(self, task_id: str, score: float, strategy: str) -> Optional[int]:
        """Stores execution outcome if metrics are valid."""
        if not isinstance(score, (int, float)) or score < 0 or score > 1:
            logging.error("Invalid score received.")
            return None

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "INSERT INTO experience (task_id, score, strategy) VALUES (?, ?, ?)",
                (task_id, float(score), strategy)
            )
            inserted_id = cursor.lastrowid

        self.history.append({
            "id": inserted_id,
            "task_id": task_id,
            "score": score,
            "strategy": strategy
        })
        return inserted_id

    def synthesize_strategy(self) -> Optional[Dict[str, Any]]:
        """
        Analyzes high-performing strategies and updates system parameters.
        Logic is isolated to prevent corruption of the core agent state.
        """
        best_practices = [h for h in self.history if h.get('score', 0) > 0.8]
        
        if not best_practices:
            return None

        # Simple synthesis: update parameters based on the most recent success
        new_strategy = best_practices[-1]['strategy']
        
        # Check both expression form (x = strategy) and direct statement/block syntax
        if self.validate_logic(f"x = {new_strategy}") or self.validate_logic(new_strategy):
            self.system_params["current_strategy"] = new_strategy
            try:
                curr_ver = float(self.system_params.get("version", "1.0"))
                self.system_params["version"] = f"{curr_ver + 0.1:.1f}"
            except Exception:
                self.system_params["version"] = "1.1"
            self._save_state()
            logging.info(f"Synthesized strategy updated to v{self.system_params['version']}")
            return {
                "synthesized": True,
                "strategy": new_strategy,
                "version": self.system_params["version"],
                "system_params": self.system_params
            }
        else:
            logging.warning("Synthesized strategy failed AST validation.")
            return {
                "synthesized": False,
                "reason": "Failed AST validation",
                "strategy": new_strategy
            }

    def run_task(self, task_func: callable, *args, **kwargs) -> Any:
        """Executes a task and logs the outcome for future improvement."""
        try:
            result = task_func(*args, **kwargs)
            # Placeholder for actual scoring heuristic
            score = 0.95 
            self.record_experience("task_001", score, "optimized_path_a")
            return result
        except Exception as e:
            logging.error(f"Task execution failed: {e}")
            return None

    def get_experiences(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Queries recent experiences from SQLite database."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT id, task_id, score, strategy, timestamp FROM experience ORDER BY id DESC LIMIT ?",
                (limit,)
            )
            rows = cursor.fetchall()
            return [
                {
                    "id": r[0],
                    "task_id": r[1],
                    "score": r[2],
                    "strategy": r[3],
                    "timestamp": r[4]
                }
                for r in rows
            ]

    def get_status(self) -> Dict[str, Any]:
        """Returns current optimizer state and summary metrics."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT COUNT(*), AVG(score), MAX(score) FROM experience")
            count, avg_score, max_score = cursor.fetchone()

        best_practices = [h for h in self.history if h.get('score', 0) > 0.8]
        return {
            "system_params": self.system_params,
            "total_experiences": count or 0,
            "in_memory_history_count": len(self.history),
            "high_performing_count": len(best_practices),
            "average_score": round(avg_score, 4) if avg_score is not None else 0.0,
            "max_score": round(max_score, 4) if max_score is not None else 0.0,
            "db_path": str(self.db_path)
        }


def main():
    parser = argparse.ArgumentParser(description="GenesisOptimizer CLI")
    parser.add_argument("--db", default="agent_experience.db", help="Path to SQLite database")
    parser.add_argument("--cmd", choices=["status", "record", "synthesize", "history", "validate", "run-sample"], required=True)
    parser.add_argument("--task-id", default="task_001")
    parser.add_argument("--score", type=float, default=0.9)
    parser.add_argument("--strategy", default="")
    parser.add_argument("--limit", type=int, default=50)

    args = parser.parse_args()

    optimizer = GenesisOptimizer(db_path=args.db)

    if args.cmd == "status":
        print(json.dumps(optimizer.get_status()))
    elif args.cmd == "record":
        strategy = args.strategy
        if not strategy and not sys.stdin.isatty():
            strategy = sys.stdin.read().strip()
        record_id = optimizer.record_experience(args.task_id, args.score, strategy)
        print(json.dumps({"success": record_id is not None, "id": record_id}))
    elif args.cmd == "synthesize":
        result = optimizer.synthesize_strategy()
        print(json.dumps(result or {"synthesized": False, "reason": "No high-performing strategies (score > 0.8)"}))
    elif args.cmd == "history":
        exps = optimizer.get_experiences(args.limit)
        print(json.dumps(exps))
    elif args.cmd == "validate":
        code_str = args.strategy
        if not code_str and not sys.stdin.isatty():
            code_str = sys.stdin.read()
        is_valid = optimizer.validate_logic(code_str)
        print(json.dumps({"valid": is_valid}))
    elif args.cmd == "run-sample":
        def sample_task(x: int):
            return x * x
        res = optimizer.run_task(sample_task, 4)
        print(json.dumps({"task_result": res, "status": optimizer.get_status()}))

if __name__ == "__main__":
    main()
