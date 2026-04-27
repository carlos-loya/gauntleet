"""Sandbox harness for gauntleet.

Wire protocol on stdin:
  Line 1: ASCII header "GLT:<n>\n" — <n> is the byte length of the source that follows.
  Bytes : <n> bytes of UTF-8 Python source.
  Bytes : remaining bytes (if any) are passed through to the user code as stdin.

Source is compiled and exec'd with __name__ = '__main__'. Anything the user
program writes to stdout/stderr is captured by the host. Exit code is the
program's exit code (0 on normal return, non-zero on uncaught exception or
explicit sys.exit()).
"""

import sys


def main() -> None:
    header = sys.stdin.buffer.readline()
    if not header.startswith(b"GLT:"):
        sys.stderr.write("sandbox protocol error: missing GLT header\n")
        sys.exit(2)
    try:
        source_len = int(header[4:].rstrip(b"\r\n"))
    except ValueError:
        sys.stderr.write("sandbox protocol error: invalid GLT length\n")
        sys.exit(2)

    source_bytes = sys.stdin.buffer.read(source_len)
    if len(source_bytes) != source_len:
        sys.stderr.write("sandbox protocol error: truncated source\n")
        sys.exit(2)

    try:
        source = source_bytes.decode("utf-8")
    except UnicodeDecodeError:
        sys.stderr.write("sandbox protocol error: source is not valid UTF-8\n")
        sys.exit(2)

    code_obj = compile(source, "<user>", "exec")
    # Any remaining bytes on stdin are still available to the user program.
    exec(code_obj, {"__name__": "__main__"})


if __name__ == "__main__":
    main()
