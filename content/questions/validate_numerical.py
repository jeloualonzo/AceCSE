"""
Validation script for numerical.json
Checks:
1. Valid JSON
2. Exactly 50 items
3. IDs num-0001..num-0050
4. Each item has exactly 4 choices
5. correctOptionId in {A,B,C,D}
6. Answer-letter distribution
7. Topic distribution
8. Difficulty distribution
9. All required fields present
"""
import json, sys

path = "/agent/workspace/acecse/content/questions/numerical.json"
with open(path) as f:
    data = json.load(f)

required_fields = {"id","examLevel","subject","topic","difficulty","question",
                   "choices","correctOptionId","explanation","tags"}

errors = []
correct_dist = {"A":0,"B":0,"C":0,"D":0}
topic_dist = {}
difficulty_dist = {}
ids_seen = set()

for i, item in enumerate(data):
    # Required fields
    missing = required_fields - item.keys()
    if missing:
        errors.append(f"{item.get('id','?')} missing fields: {missing}")

    # ID format
    iid = item.get("id","")
    if iid in ids_seen:
        errors.append(f"Duplicate id: {iid}")
    ids_seen.add(iid)

    # Exactly 4 choices
    choices = item.get("choices",[])
    if len(choices) != 4:
        errors.append(f"{iid}: has {len(choices)} choices (expected 4)")
    choice_ids = {c["id"] for c in choices}
    if choice_ids != {"A","B","C","D"}:
        errors.append(f"{iid}: choice IDs {choice_ids} != {{A,B,C,D}}")

    # correctOptionId in ABCD
    corr = item.get("correctOptionId","")
    if corr not in {"A","B","C","D"}:
        errors.append(f"{iid}: correctOptionId '{corr}' not in ABCD")
    else:
        correct_dist[corr] += 1

    # topic
    t = item.get("topic","?")
    topic_dist[t] = topic_dist.get(t,0) + 1

    # difficulty
    d = item.get("difficulty","?")
    difficulty_dist[d] = difficulty_dist.get(d,0) + 1

    # examLevel
    if item.get("examLevel") != "Both":
        errors.append(f"{iid}: examLevel should be 'Both'")

    # subject
    if item.get("subject") != "Numerical Reasoning":
        errors.append(f"{iid}: subject mismatch")

print("="*55)
print(f"Total items: {len(data)}")
print(f"Errors found: {len(errors)}")
for e in errors:
    print(f"  ERROR: {e}")

print()
print("Answer-letter distribution:")
for k,v in sorted(correct_dist.items()):
    print(f"  {k}: {v}")

print()
print("Topic distribution:")
for k,v in sorted(topic_dist.items()):
    print(f"  {k}: {v}")

print()
print("Difficulty distribution:")
for k,v in sorted(difficulty_dist.items()):
    print(f"  {k}: {v}")

# Verify IDs 0001..0050
expected_ids = {f"num-{i:04d}" for i in range(1,51)}
missing_ids = expected_ids - ids_seen
extra_ids = ids_seen - expected_ids
if missing_ids:
    print(f"\nMissing IDs: {sorted(missing_ids)}")
if extra_ids:
    print(f"Extra IDs: {sorted(extra_ids)}")
if not missing_ids and not extra_ids:
    print("\nID range: num-0001 to num-0050 — complete and sequential.")

if len(errors) == 0:
    print("\nVALIDATION PASSED.")
    sys.exit(0)
else:
    print("\nVALIDATION FAILED — see errors above.")
    sys.exit(1)
