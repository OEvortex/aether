import re
from pathlib import Path

# Read the extension bundle
path = Path(r"c:\Users\koula\.vscode-insiders\extensions\blackboxapp.blackboxagent-3.6.76\dist\extension.js")
text = path.read_text(encoding="utf-8", errors="ignore")

# Find all URL-like patterns
url_pattern = r'https?://[^\s"\'<>]+[^\s"\'<>.,;:!?)]'
urls = re.findall(url_pattern, text)

# Also look for API-like paths in the code
api_pattern = r'["\'](/api[^"\']*|/v\d+[^"\']*|/models[^"\']*|/chat[^"\']*|/completions[^"\']*)["\']'
api_paths = re.findall(api_pattern, text)

print("=== FOUND URLS ===")
for url in sorted(set(urls)):
    print(url)

print("\n=== FOUND API PATHS ===")
for path in sorted(set(api_paths)):
    print(path)

# Now examine context around potential public endpoints
print("\n=== EXAMINING CONTEXT FOR POTENTIAL PUBLIC ENDPOINTS ===")
public_indicators = ['/models', '/health', '/status', '/version', '/ping', '/public', '/openapi', '/swagger']

for indicator in public_indicators:
    # Look for this pattern in the text
    pattern = rf'["\']{re.escape(indicator)}[^"\']*["\']'
    matches = re.findall(pattern, text)
    if matches:
        print(f"\nFound {indicator} related patterns:")
        for match in matches[:3]:  # Show first 3 matches
            # Get context around the match
            idx = text.find(match)
            if idx != -1:
                start = max(0, idx - 100)
                end = min(len(text), idx + len(match) + 100)
                print(f"  Context: ...{text[start:end]}...")
                print()