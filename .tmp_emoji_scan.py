import pathlib

root = pathlib.Path('.')
emoji_ranges = [
    (0x1F000, 0x1FAFF),
    (0x2600, 0x27BF),
]

def has_emoji(ch):
    code = ord(ch)
    return any(start <= code <= end for start, end in emoji_ranges)

for path in root.rglob('*'):
    if path.is_dir():
        continue
    try:
        text = path.read_text(encoding='utf-8')
    except Exception:
        continue
    for idx, line in enumerate(text.splitlines(), 1):
        if any(has_emoji(ch) for ch in line):
            safe_line = line.rstrip().encode('unicode_escape').decode('ascii')
            print(f"{path}:{idx}:{safe_line}")
