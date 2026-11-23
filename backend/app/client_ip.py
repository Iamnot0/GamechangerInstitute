import ipaddress
from typing import Final

from starlette.requests import Request

_IPV6_SUBSCRIBER_PREFIX: Final = 64


def client_identity(request: Request, trusted_header: str | None) -> str | None:
    """The rate-limit identity of the caller, or None when no valid IP address is available.

    The address comes from a header the edge proxy overwrites when one is trusted, otherwise from the peer. IPv4 and
    IPv4-mapped IPv6 addresses identify a client by address. Native IPv6 identifies it by /64, the block a single
    subscriber is normally assigned, so rotating addresses inside it does not reset the limit.
    """
    if trusted_header is not None:
        candidate = request.headers.get(trusted_header)
    else:
        candidate = request.client.host if request.client else None
    if candidate is None:
        return None
    try:
        address = ipaddress.ip_address(candidate.strip())
    except ValueError:
        return None

    if isinstance(address, ipaddress.IPv6Address):
        if address.ipv4_mapped is not None:
            return str(address.ipv4_mapped)
        return str(ipaddress.ip_network(f"{address}/{_IPV6_SUBSCRIBER_PREFIX}", strict=False))
    return str(address)
