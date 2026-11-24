import hashlib
import hmac
import ipaddress
from typing import Final

from starlette.requests import Request

VISITOR_ADDRESS_HEADER: Final = "x-visitor-address"
VISITOR_SIGNATURE_HEADER: Final = "x-visitor-signature"
_VISITOR_SIGNATURE_CONTEXT: Final = b"visitor-address\n"
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
    return _identity_of(candidate)


def vouched_visitor_identity(request: Request, key: bytes) -> str | None:
    """The visitor the site's own server says it is calling for, or None when it vouches for nobody.

    Staff sign in through the site's server, so the caller this service sees is that server, the same for every
    visitor. The server signs the address the edge gave it; without the key nobody else can name a visitor.
    """
    address = request.headers.get(VISITOR_ADDRESS_HEADER)
    signature = request.headers.get(VISITOR_SIGNATURE_HEADER)
    if address is None or signature is None:
        return None
    expected = hmac.new(key, _VISITOR_SIGNATURE_CONTEXT + address.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected.encode(), signature.encode()):
        return None
    return _identity_of(address)


def _identity_of(candidate: str | None) -> str | None:
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
