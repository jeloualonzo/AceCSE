"""
Rebalance answer-letter distribution.
Current: A=2, B=10, C=24, D=14 (target: ~12-13 each)
Strategy: for questions where the correct answer is at a specific position
among the choices, rotate the choices so the correct text lands on a
different letter, and update correctOptionId accordingly.
We do NOT change which answer is correct — only the slot it occupies.

Target after rebalance: A~13, B~12, C~13, D~12
"""
import json, copy

path = "/agent/workspace/acecse/content/questions/numerical.json"
with open(path) as f:
    data = json.load(f)

# Current correct texts mapped by id
# We will reassign letter positions for selected questions.
# Items to convert C→A (need +11 A's, will take from C and B):
# Pick questions currently C that should become A
# Items to convert C→B: pick some Cs
# Items to convert D→B: pick some Ds

# Plan:
#  C -> A: items num-0002,0003,0006,0007,0011,0015,0027,0035,0042,0047,0048
#  D -> B: items num-0013,0034,0039,0040,0049,0050  (6 items D->B adds 6 B, removes 6 D => D:8)
#  B -> D: items num-0010,0020,0028 (3 items, adds 3 D => D:11... still off, let's re-plan)

# Let me count more carefully.
# Goal: A=12 or 13, B=12 or 13, C=12 or 13, D=12 or 13.  Total=50.
# Current: A=2, B=10, C=24, D=14
# Need: A+=11, B+=2, C-=12, D-=1  (target 13,12,12,13)

# From C: move 11 to A, 1 to D. Net C: 24-12=12.
# From D: move 1 from D to B. Net D: 14-1=13.
# B: 10+1=11... still off.  Let me try 13,12,13,12
# A+=11 (from C), C-=11 => C=13
# B+=2, from C one more and from D 1: C-=1, D-=1 => C=12, D=13. Still off.
# Simplest: A target=13, B=12, C=13, D=12. Total=50.
# Moves needed: A+11(from C11), B+2(from C1,D1), C-12, D-2
# But D only needs -2.

# C -> A: 11 questions
c_to_a = ["num-0002","num-0003","num-0006","num-0007","num-0011",
          "num-0015","num-0027","num-0035","num-0042","num-0047","num-0048"]
# C -> B: 1 question
c_to_b = ["num-0043"]
# D -> B: 1 question
d_to_b = ["num-0045"]
# D -> A: 1 question (to get A to 13)  -- wait, A already gets +11 from c_to_a = 2+11=13 ok
# D current=14, remove 1 (d_to_b) => D=13. Need D=12, so remove 2.
d_to_b2 = ["num-0037"]  # also move this D->B  => D=13-1=12, B=10+1+1=12.
# Check: A=2+11=13, B=10+1+1=12, C=24-11-1=12, D=14-1-1=12.
# Hmm wait that's 13+12+12+12=49 — off by 1. Let me recount original.

# Re-verify original from json
from collections import Counter
orig = Counter(item["correctOptionId"] for item in data)
print("Original:", dict(orig))
# A=2 B=10 C=24 D=14 => total 50 ✓

# Target: 13,13,12,12 or 12,13,13,12 etc — any near-equal split
# A=13, B=13, C=12, D=12 → total=50
# Moves: A+11, B+3, C-12, D-2
# C->A: 11, C->B: 1, D->B: 2 => net: A+11=13, B+3=13, C-12=12, D-2=12 ✓

c_to_a = ["num-0002","num-0003","num-0006","num-0007","num-0011",
          "num-0015","num-0027","num-0035","num-0042","num-0047","num-0048"]
c_to_b = ["num-0043"]
d_to_b = ["num-0037","num-0045"]

# Build mapping: id -> (old_correct_letter, new_correct_letter)
moves = {}
for qid in c_to_a: moves[qid] = ("C","A")
for qid in c_to_b: moves[qid] = ("C","B")
for qid in d_to_b: moves[qid] = ("D","B")

def rotate_choices(choices, old_correct_id, new_correct_id):
    """
    Swap the text of the correct option into new_correct_id slot,
    and move whatever was there to old_correct_id slot.
    Returns new choices list and confirms correctOptionId.
    """
    choices = copy.deepcopy(choices)
    # Find current correct text
    by_id = {c["id"]: c for c in choices}
    old_text = by_id[old_correct_id]["text"]
    displaced_text = by_id[new_correct_id]["text"]
    # Swap
    by_id[new_correct_id]["text"] = old_text
    by_id[old_correct_id]["text"] = displaced_text
    return list(by_id.values())

modified = 0
for item in data:
    qid = item["id"]
    if qid in moves:
        old_letter, new_letter = moves[qid]
        assert item["correctOptionId"] == old_letter, \
            f"{qid}: expected correct={old_letter} but got {item['correctOptionId']}"
        item["choices"] = rotate_choices(item["choices"], old_letter, new_letter)
        item["correctOptionId"] = new_letter
        modified += 1

print(f"Modified {modified} items")

# Verify new distribution
new_dist = Counter(item["correctOptionId"] for item in data)
print("New distribution:", dict(new_dist))

with open(path,"w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
print("Written to", path)
