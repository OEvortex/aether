import re
from pathlib import Path

# Read the extension bundle
path = Path(r"c:\koula\.vscode-insiders\extensions\blackboxapp.blackboxagent-3.6.76\dist\extension.js")
text = path.read_text(encoding="utf-8", errors="ignore")

# Look for patterns that show how authentication is handled
auth_patterns = [
    r'apiKey',
    r'authorization',
    r'Authorization',
    r'x-api-key',
    r'X-API-Key',
    r'Bearer',
    r'extractSecurity',
    r'\.apiKey',
    r'headers.*apiKey',
    r'headers.*Authorization'
]

print("=== AUTHENTICATION PATTERNS FOUND ===")
for pattern in auth_patterns:
    matches = re.findall(pattern, text, re.IGNORECASE)
    if matches:
        print(f"\nPattern '{pattern}': {len(matches)} matches")
        # Show unique matches
        unique_matches = list(set(matches))[:5]  # Show first 5 unique matches
        for match in unique_matches:
            print(f"  - {match}")

# Look for the specific security extraction pattern we saw
security_pattern = r'lea\.extractSecurity|extractSecurity\([^)]*\)'
security_matches = re.findall(security_pattern, text)
print(f"\n=== SECURITY EXTRACTION PATTERNS ===")
print(f"Found {len(security_matches)} security extraction patterns")
for match in security_matches[:5]:
    print(f"  - {match}")

# Look for where apiKey is used in headers
api_key_in_headers = r'headers[^}]*apiKey[^}]*|apiKey[^}]*headers'
api_key_header_matches = re.findall(api_key_in_headers, text, re.IGNORECASE)
print(f"\n=== API KEY IN HEADERS PATTERNS ===")
print(f"Found {len(api_key_header_matches)} API key in headers patterns")
for match in api_key_header_matches[:5]:
    print(f"  - {match}")

# Look for the specific pattern from the models context: wi([{...s?.toString()!=null?{"anthropic-beta":s?.toString()}:void 0},a?.headers])
wi_pattern = r'wi\(\[[^\]]*\]\)'
wi_matches = re.findall(wi_pattern, text)
print(f"\n=== WI HEADERS PATTERNS ===")
print(f"Found {len(wi_matches)} wi() headers patterns")
for match in wi_matches[:5]:
    print(f"  - {match}")

# Now let's look for any endpoints that might be called WITHOUT authentication
# by looking for patterns that don't include the security extraction
print("\n=== LOOKING FOR POTENTIALLY UNAUTHENTICATED ENDPOINTS ===")

# Look for fetch/XMLHttpRequest calls and see if they have security context
fetch_pattern = r'fetch\s*\([^)]*\)'
xhr_pattern = r'new\s+XMLHttpRequest\s*\([^)]*\)|XMLHttpRequest\s*\([^)]*\)'

fetch_matches = re.findall(fetch_pattern, text, re.IGNORECASE)
xhr_matches = re.findall(xhr_pattern, text, re.IGNORECASE)

print(f"Found {len(fetch_matches)} fetch calls")
print(f"Found {len(xhr_matches)} XMLHttpRequest calls")

# Check a few fetch calls for security context
print("\n=== SAMPLE FETCH CALLS WITH CONTEXT ===")
for i, fetch_call in enumerate(fetch_matches[:10]):
    # Find the context around this fetch call
    idx = text.find(fetch_call)
    if idx != -1:
        start = max(0, idx - 200)
        end = min(len(text), idx + len(fetch_call) + 200)
        context = text[start:end]
        
        # Check if this context contains security/authentication patterns
        has_security = bool(re.search(r'apiKey|Authorization|extractSecurity|Bearer', context, re.IGNORECASE))
        
        print(f"\nFetch call {i+1}: {fetch_call[:100]}...")
        print(f"Has security/auth: {has_security}")
        if not has_security and len(fetch_call) > 20:  # Only show if it looks substantial and no auth
            print(f"  Context: ...{context}...")
            print("  *** POTENTIALLY UNAUTHENTICATED ***")
        print("-" * 60)