import re
from pathlib import Path

# Read the extension bundle
path = Path(r"c:\Users\koula\.vscode-insiders\extensions\blackboxapp.blackboxagent-3.6.76\dist\extension.js")
text = path.read_text(encoding="utf-8", errors="ignore")

# Look for the specific models endpoint usage
models_pattern = r'/models[^"\']*'
models_matches = re.findall(models_pattern, text)

print("=== MODELS ENDPOINT USAGE ===")
for match in models_matches:
    print(f"Found: {match}")
    
    # Find context around this match
    idx = text.find(match)
    if idx != -1:
        start = max(0, idx - 150)
        end = min(len(text), idx + len(match) + 150)
        context = text[start:end]
        print(f"Context: ...{context}...")
        print("-" * 80)

# Also look for any fetch/XMLHttpRequest calls to models endpoint
fetch_pattern = r'fetch\s*\([^)]*\/models[^)]*\)'
xhr_pattern = r'XMLHttpRequest[^)]*\/models[^)]*'

print("\n=== FETCH/XHR CALLS TO MODELS ENDPOINT ===")
fetch_matches = re.findall(fetch_pattern, text, re.IGNORECASE)
xhr_matches = re.findall(xhr_pattern, text, re.IGNORECASE)

for match in fetch_matches:
    print(f"Fetch: {match}")

for match in xhr_matches:
    print(f"XHR: {match}")

# Look for the specific pattern we saw in the context: this._client.get(`/models/${e}`,n)
client_get_pattern = r'this\._client\.get\s*\([^)]*\/models[^)]*\)'
client_get_matches = re.findall(client_get_pattern, text)

print("\n=== CLIENT.GET CALLS TO MODELS ENDPOINT ===")
for match in client_get_matches:
    print(f"Client.get: {match}")
    
    # Find context
    idx = text.find(match)
    if idx != -1:
        start = max(0, idx - 200)
        end = min(len(text), idx + len(match) + 200)
        context = text[start:end]
        print(f"Context: ...{context}...")
        print("=" * 80)