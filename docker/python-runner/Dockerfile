# syntax=docker/dockerfile:1.7
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY runner.py /usr/local/bin/runner.py
RUN chmod 755 /usr/local/bin/runner.py

WORKDIR /sandbox
USER 65534:65534

ENTRYPOINT ["python", "-I", "/usr/local/bin/runner.py"]
