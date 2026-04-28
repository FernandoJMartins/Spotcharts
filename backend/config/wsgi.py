"""Minimal WSGI application placeholder.

This allows `gunicorn config.wsgi:application` to start without a full
Django project while you develop locally. Replace with your real
`config.wsgi` when the Django project is present.
"""

def application(environ, start_response):
    status = '200 OK'
    headers = [('Content-Type', 'text/plain; charset=utf-8')]
    start_response(status, headers)
    return [b"Spotcharts backend placeholder running\n"]
