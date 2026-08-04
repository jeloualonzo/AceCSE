"""
Rebalance: A=2,B=10,C=24,D=14 -> A=13,B=13,C=12,D=12
Moves:
  C -> A: 11 items
  C -> B: 1 item    => C goes 24-12=12
  D -> B: 2 items   => D goes 14-2=12, B goes 10+1+2=13, A goes 2+11=13
"""
import json, copy
from collections import Counter

path = "/agent/workspace/acecse/content/questions/numerical.json"
with open(path) as f:
    data = json.load(f)

# Items to move (using actual IDs from file)
c_to_a = ["num-0001","num-0005","num-0006","num-0007","num-0011",
          "num-0014","num-0017","num-0019","num-0020","num-0021","num-0025"]
c_to_b = ["num-0026"]
d_to_b = ["num-0022","num-0024"]

moves = {}
for qid in c_to_a: moves[qid] = ("C","A")
for qid in c_to_b: moves[qid] = ("C","B")
for qid in d_to_b: moves[qid] = ("D","B")

def swap_choices(choices, old_letter, new_letter):
    """Swap correct answer from old_letter slot to new_letter slot."""
    ch = copy.deepcopy(choices)
    by_id = {c["id"]: c for c in ch}
    old_text = by_id[old_letter]["text"]
    new_text = by_id[new_letter]["text"]
    by_id[old_letter]["text"] = new_text
    by_id[new_letter]["text"] = old_text
    return [by_id["A"], by_id["B"], by_id["C"], by_id["D"]]

modified = 0
for item in data:
    qid = item["id"]
    if qid in moves:
        old_letter, new_letter = moves[qid]
        if item["correctOptionId"] != old_letter:
            print(f"SKIP {qid}: expected {old_letter}, got {item['correctOptionId']}")
            continue
        item["choices"] = swap_choices(item["choices"], old_letter, new_letter)
        item["correctOptionId"] = new_letter
        modified += 1

print(f"Modified {modified} items")
new_dist = Counter(item["correctOptionId"] for item in data)
print("New distribution:", dict(new_dist))

with open(path,"w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
print("File updated.")
