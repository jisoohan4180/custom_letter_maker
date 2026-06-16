import time
from threading import Lock


class LockoutTracker:
    def __init__(self, max_attempts: int = 5, lockout_seconds: int = 30) -> None:
        self._max_attempts = max_attempts
        self._lockout_seconds = lockout_seconds
        self._attempts = 0
        self._locked_until: float = 0.0
        self._lock = Lock()

    def is_locked(self) -> bool:
        with self._lock:
            return time.time() < self._locked_until

    def seconds_remaining(self) -> int:
        with self._lock:
            return max(0, int(self._locked_until - time.time()))

    def record_failure(self) -> None:
        with self._lock:
            self._attempts += 1
            if self._attempts >= self._max_attempts:
                self._locked_until = time.time() + self._lockout_seconds
                self._attempts = 0

    def record_success(self) -> None:
        with self._lock:
            self._attempts = 0
            self._locked_until = 0.0

    def reset(self) -> None:
        with self._lock:
            self._attempts = 0
            self._locked_until = 0.0


lockout_tracker = LockoutTracker()
