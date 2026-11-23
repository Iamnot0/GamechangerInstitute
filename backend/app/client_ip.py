import ipaddress

from starlette.requests import Request


def client_ip(request: Request, trusted_header: str | None) -> str | None:
    """The caller's IP address: from a header that the edge proxy overwrites when one is trusted, else the peer."""
    if trusted_header is not None:
        candidate = request.headers.get(trusted_header)
    else:
        candidate = request.client.host if request.client else None
    if candidate is None:
        return None
    try:
        return str(ipaddress.ip_address(candidate.strip()))
    except ValueError:
        return None
