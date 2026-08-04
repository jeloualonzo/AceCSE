"""
Rebalance answer-letter distribution.
Actual: A=2, B=9, C=24, D=15 (based on actual file)
Target: A=13, B=13, C=12, D=12
Moves needed: A+11, B+4, C-12, D-3

Plan:
C -> A: 11 items  (brings C to 13, A to 13)
C -> B: 1 item    (brings C to 12, B to 10)
D -> B: 3 items   (brings D to 12, B to 13)
Net: A=13, B=13, C=12, D=12 ✓

Actual distribution from file:
A: 0008, 0016
B: 0003, 0004, 0009, 0010, 0012, 0018, 0023, 0028, 0040
C: 0001, 0005, 0006, 0007, 0011, 0014, 0017, 0019, 0020, 0021, 0025, 0026, 0027, 0030, 0031, 0032, 0034, 0035, 0037, 0042, 0043, 0047, 0048, 0049
D: 0002, 0013(was B!), 0015, 0022, 0024, 0029, 0033, 0036, 0038, 0039, 0041, 0044, 0045, 0046, 0050

Wait — let me just use actual counts from the file.
"""
import json, copy
from collections import Counter

path = "/agent/workspace/acecse/content/questions/numerical.json"
with open(path) as f:
    data = json.load(f)

# Build actual mapping
actual = {item["id"]: item["correctOptionId"] for item in data}
print("Actual distribution:", dict(Counter(actual.values())))

# C items (24): pick 11 to move to A, 1 to move to B
c_items = [qid for qid,v in actual.items() if v=="C"]
d_items = [qid for qid,v in actual.items() if v=="D"]

print(f"C items ({len(c_items)}): {c_items}")
print(f"D items ({len(d_items)}): {d_items}")
