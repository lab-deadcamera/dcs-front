import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('C:/Users/Drako/Desktop/DEAD-CAMERA/dcs-front/src/app/modules/studio/studio/ui/index-studio/index-studio.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the breadcrumb handlers section
start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if 'Breadcrumb event handlers' in line and '─' in line:
        start_idx = i
        break

if start_idx is None:
    print('ERROR: marker not found')
    sys.exit(1)

print(f'Start at line {start_idx+1}: {repr(lines[start_idx].rstrip())}')

# Find the end of the reloadShots method (next double-comment or empty-line+method)
# Look for "private reloadShots" to find the method start
for j in range(start_idx + 1, len(lines)):
    if 'startSessionWithShot' in lines[j]:
        # Find the blank line + next section after reloadShots
        for k in range(j, len(lines)):
            if lines[k].strip() == '' and k+1 < len(lines) and lines[k+1].startswith('  /**'):
                end_idx = k
                break
        break

if end_idx:
    print(f'End at line {end_idx+1}: {repr(lines[end_idx].rstrip())}')
else:
    print('Could not find end, looking harder')
    # Try to find persistNav or the start of startSessionWithShot
    for k in range(len(lines)-1, start_idx, -1):
        if 'private reloadShots' in lines[k]:
            for m in range(k, len(lines)):
                if m+1 < len(lines) and lines[m].strip() == '' and ('/**' in lines[m+1] or 'private ' in lines[m+1] or 'protected ' in lines[m+1]):
                    end_idx = m
                    break
            break
    print(f'End at line {end_idx+1}: {repr(lines[end_idx].rstrip()) if end_idx else "not found"}')

# Count dashes in the marker line
marker = lines[start_idx]
dash_count = marker.count('─')
print(f'Dash count in marker: {dash_count}')
print(f'Exact marker: {repr(marker.rstrip())}')
