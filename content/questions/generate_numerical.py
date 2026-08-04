"""
Script to generate and verify all 50 numerical reasoning questions.
Steps through each question, verifies the correct answer mathematically,
then writes the final JSON.
"""
import json, math, fractions

# ── Verification helpers ───────────────────────────────────────────────────────

def verify(qid, result, expected, label=""):
    ok = abs(float(result) - float(expected)) < 1e-9 if isinstance(expected, (int, float)) else result == expected
    status = "OK" if ok else f"FAIL  got={result}  expected={expected}"
    print(f"{qid} {label}: {status}")
    return ok

# ══════════════════════════════════════════════════════════════════════════════
# BLOCK 1 – Basic Operations & Fractions/Decimals  (8 questions: 0001–0008)
# ══════════════════════════════════════════════════════════════════════════════

# num-0001 Easy – fraction addition
# 3/8 + 5/12 = ?
a, b = fractions.Fraction(3,8), fractions.Fraction(5,12)
ans_0001 = a + b          # 9/24 + 10/24 = 19/24
verify("num-0001", ans_0001, fractions.Fraction(19,24))

# num-0002 Easy – decimal multiplication
# 4.25 × 3.6 = ?
ans_0002 = 4.25 * 3.6     # 15.3
verify("num-0002", round(ans_0002,4), 15.3)

# num-0003 Easy – order of operations
# 48 ÷ (6 – 2) × 3 + 5 = ?
ans_0003 = 48 / (6-2) * 3 + 5   # 12*3+5 = 41
verify("num-0003", ans_0003, 41)

# num-0004 Medium – mixed-number subtraction
# 7¾ – 3⅝ = ?
a4, b4 = fractions.Fraction(31,4), fractions.Fraction(29,8)
ans_0004 = a4 - b4        # 62/8 - 29/8 = 33/8 = 4 1/8
verify("num-0004", ans_0004, fractions.Fraction(33,8))

# num-0005 Medium – division of decimals
# 56.7 ÷ 0.035 = ?
ans_0005 = 56.7 / 0.035   # 1620
verify("num-0005", round(ans_0005,4), 1620.0)

# num-0006 Medium – fraction × fraction
# (2/3) × (9/14) = ?
ans_0006 = fractions.Fraction(2,3) * fractions.Fraction(9,14)  # 18/42 = 3/7
verify("num-0006", ans_0006, fractions.Fraction(3,7))

# num-0007 Hard – complex fraction
# (5/6 + 1/4) ÷ (7/8 – 1/3) = ?
num_0007 = fractions.Fraction(5,6) + fractions.Fraction(1,4)   # 10/12+3/12 = 13/12
den_0007 = fractions.Fraction(7,8) - fractions.Fraction(1,3)   # 21/24-8/24 = 13/24
ans_0007 = num_0007 / den_0007   # (13/12)/(13/24) = (13/12)*(24/13) = 24/12 = 2
verify("num-0007", ans_0007, fractions.Fraction(2,1))

# num-0008 Hard – combined operations
# 2⅔ × 1½ – 4/5 ÷ 2/3 = ?
a8 = fractions.Fraction(8,3) * fractions.Fraction(3,2)   # 24/6 = 4
b8 = fractions.Fraction(4,5) / fractions.Fraction(2,3)   # 12/10 = 6/5
ans_0008 = a8 - b8   # 4 - 6/5 = 20/5 - 6/5 = 14/5
verify("num-0008", ans_0008, fractions.Fraction(14,5))

# ══════════════════════════════════════════════════════════════════════════════
# BLOCK 2 – Percentages & Ratio/Proportion  (10 questions: 0009–0018)
# ══════════════════════════════════════════════════════════════════════════════

# num-0009 Easy – percent of a number
# What is 35% of 2,400?
ans_0009 = 0.35 * 2400    # 840
verify("num-0009", ans_0009, 840)

# num-0010 Easy – percent increase
# A salary of ₱18,000 increased by 12%. New salary?
ans_0010 = 18000 * 1.12   # 20,160
verify("num-0010", ans_0010, 20160)

# num-0011 Medium – percent of percent
# 20% of 30% of 500 = ?
ans_0011 = 0.20 * 0.30 * 500   # 30
verify("num-0011", ans_0011, 30)

# num-0012 Medium – reverse percentage (finding original)
# After a 15% discount, an item costs ₱2,295. Original price?
ans_0012 = 2295 / 0.85    # 2700
verify("num-0012", round(ans_0012,2), 2700.0)

# num-0013 Medium – ratio split
# Divide ₱7,200 between Ana and Ben in ratio 5:4. How much does Ana get?
total_parts = 5 + 4
ana = 7200 * 5 / total_parts   # 4000
verify("num-0013", ana, 4000)

# num-0014 Medium – proportion (direct)
# If 8 workers can paint a wall in 6 days, how many days will 12 workers take?
# 8×6 = 12×d  → d=4
ans_0014 = (8*6)/12    # 4
verify("num-0014", ans_0014, 4)

# num-0015 Medium – percentage change
# Price dropped from ₱4,500 to ₱3,780. Percentage decrease?
ans_0015 = (4500 - 3780) / 4500 * 100   # 16%
verify("num-0015", ans_0015, 16)

# num-0016 Medium – mark-up then discount
# Item bought at ₱800. Marked up 40%, then discounted 20%. Selling price?
marked = 800 * 1.40    # 1120
selling = marked * 0.80   # 896
verify("num-0016", selling, 896)
ans_0016 = selling

# num-0017 Hard – compound ratio/proportion
# If 5 machines produce 150 parts in 3 hours, how many parts do 8 machines produce in 5 hours?
# rate per machine per hour = 150/(5*3) = 10 parts
rate_m = 150 / (5*3)
ans_0017 = rate_m * 8 * 5   # 400
verify("num-0017", ans_0017, 400)

# num-0018 Hard – successive percentage changes
# A government fund of ₱500,000 grew 10% in Year 1 and declined 5% in Year 2. Final value?
y1 = 500000 * 1.10    # 550,000
y2 = y1 * 0.95       # 522,500
verify("num-0018", y2, 522500)
ans_0018 = y2

# ══════════════════════════════════════════════════════════════════════════════
# BLOCK 3 – Number Sequences / Series  (8 questions: 0019–0026)
# ══════════════════════════════════════════════════════════════════════════════

# num-0019 Easy – arithmetic sequence: 4, 9, 14, 19, ? (d=5)
ans_0019 = 19 + 5    # 24
verify("num-0019", ans_0019, 24)

# num-0020 Easy – geometric sequence: 3, 6, 12, 24, ? (r=2)
ans_0020 = 24 * 2    # 48
verify("num-0020", ans_0020, 48)

# num-0021 Medium – alternating differences: 2, 5, 9, 14, 20, ?
# differences: 3, 4, 5, 6, 7
ans_0021 = 20 + 7    # 27
verify("num-0021", ans_0021, 27)

# num-0022 Medium – fibonacci-like: 1, 1, 2, 3, 5, 8, ?
ans_0022 = 5 + 8    # 13
verify("num-0022", ans_0022, 13)

# num-0023 Medium – multiply-then-add: 2, 5, 11, 23, ?
# rule: ×2+1: 2→5: 2*2+1=5; 5*2+1=11; 11*2+1=23; 23*2+1=47
ans_0023 = 23*2 + 1   # 47
verify("num-0023", ans_0023, 47)

# num-0024 Medium – squared differences: 1, 4, 9, 16, 25, ?
ans_0024 = 36    # perfect squares
verify("num-0024", ans_0024, 36)

# num-0025 Hard – two interleaved sequences: 3, 7, 4, 10, 5, 13, 6, ?
# Odd positions: 3,4,5,6 (d=1); Even positions: 7,10,13,? (d=3) → 16
ans_0025 = 16
verify("num-0025", ans_0025, 16)

# num-0026 Hard – second differences: 1, 3, 7, 13, 21, ?
# differences: 2,4,6,8; second diff constant 2 → next diff=10 → 21+10=31
ans_0026 = 21 + 10   # 31
verify("num-0026", ans_0026, 31)

# ══════════════════════════════════════════════════════════════════════════════
# BLOCK 4 – Word Problems  (14 questions: 0027–0040)
# ══════════════════════════════════════════════════════════════════════════════

# ── Work-rate problems ────────────────────────────────────────────────────────

# num-0027 Easy – two workers together
# Carla finishes a report in 6 hours, Dana in 4 hours. Together?
# combined rate = 1/6 + 1/4 = 5/12; time = 12/5 = 2.4 hours
ans_0027 = fractions.Fraction(1,6) + fractions.Fraction(1,4)
time_0027 = 1 / ans_0027   # 12/5
verify("num-0027", time_0027, fractions.Fraction(12,5))

# num-0028 Medium – three workers, one joins late
# Pipe A fills tank in 12 min, Pipe B in 18 min. A opened first; B joined after 3 min. Time to fill?
# After 3 min: A fills 3/12 = 1/4. Remaining: 3/4.
# Combined rate A+B = 1/12+1/18 = 5/36
filled_by_a = fractions.Fraction(3,12)
remaining_0028 = 1 - filled_by_a   # 3/4
combined_rate_0028 = fractions.Fraction(1,12) + fractions.Fraction(1,18)  # 5/36
extra_time = remaining_0028 / combined_rate_0028   # (3/4)/(5/36)= (3/4)*(36/5)=108/20=27/5
total_0028 = 3 + extra_time   # 3 + 27/5 = 15/5+27/5 = 42/5 = 8.4 min
verify("num-0028", total_0028, fractions.Fraction(42,5))

# num-0029 Hard – work rate with efficiency factor
# Efren can do a job in 10 days. After working 4 days, Felix joins & together finish in 3 more days.
# Days for Felix alone?
# Efren does 4/10 = 2/5 in 4 days. Remaining: 3/5.
# In 3 days: Efren does 3/10, Felix does 3/F. Sum=3/5.
# 3/F = 3/5 - 3/10 = 6/10-3/10 = 3/10 → F=10
efren_remaining = fractions.Fraction(3,5) - fractions.Fraction(3,10)  # 3/10
F_days = 3 / efren_remaining   # 10
verify("num-0029", F_days, 10)
ans_0029 = F_days

# ── Age problems ─────────────────────────────────────────────────────────────

# num-0030 Easy – present age
# Mia is 3 times as old as her son. In 8 years, she will be twice as old. Son's age now?
# M = 3S; M+8 = 2(S+8) → 3S+8 = 2S+16 → S=8
S_0030 = 8
M_0030 = 3*8   # 24
verify("num-0030", M_0030 + 8, 2*(S_0030+8))
ans_0030 = S_0030

# num-0031 Medium – age difference
# Romy is 6 years older than Sonia. In 4 years, the sum of their ages will be 50.
# Current ages?
# (R+4)+(S+4)=50; R+S+8=50; R+S=42; R=S+6 → 2S+6=42 → S=18, R=24
S_0031 = 18
R_0031 = 24
verify("num-0031", R_0031+S_0031, 42)
verify("num-0031b", (R_0031+4)+(S_0031+4), 50)
ans_0031 = R_0031   # Romy's age now

# ── Mixture problems ─────────────────────────────────────────────────────────

# num-0032 Medium – alligation
# Cashews worth ₱320/kg mixed with peanuts worth ₱80/kg to make 10 kg mix worth ₱200/kg.
# kg of cashews?
# 320x + 80(10-x) = 200*10
# 320x + 800 - 80x = 2000
# 240x = 1200 → x=5
x_0032 = (200*10 - 80*10) / (320-80)   # 1200/240=5
verify("num-0032", x_0032, 5)
ans_0032 = x_0032

# num-0033 Hard – concentration mixture
# 30 L of 40% acid solution. How many liters of pure acid to add to make 60% solution?
# 0.40*30 + x = 0.60*(30+x)
# 12 + x = 18 + 0.6x
# 0.4x = 6 → x=15
x_0033 = (0.60*30 - 0.40*30) / (1 - 0.60)   # (18-12)/0.4 = 6/0.4 = 15
verify("num-0033", x_0033, 15)
ans_0033 = x_0033

# ── Distance-Speed-Time problems ─────────────────────────────────────────────

# num-0034 Easy – basic d=s×t
# A jeepney travels at 60 km/h. Distance in 2.5 hours?
ans_0034 = 60 * 2.5    # 150 km
verify("num-0034", ans_0034, 150)

# num-0035 Medium – average speed (round trip)
# Manila to Batangas at 80 km/h, return at 60 km/h. Average speed?
# Avg speed = 2*80*60/(80+60) = 9600/140 = 480/7 ≈ 68.571
ans_0035 = 2*80*60/(80+60)
verify("num-0035", round(ans_0035,4), round(9600/140,4))
ans_0035_exact = fractions.Fraction(9600,140)   # 480/7

# num-0036 Medium – two trains approach
# Trains A and B are 360 km apart, moving toward each other at 90 and 70 km/h. Meet in?
ans_0036 = 360 / (90+70)   # 360/160 = 2.25 hours
verify("num-0036", ans_0036, 2.25)

# num-0037 Hard – chase problem
# Runner A starts at 7:00 AM at 8 km/h. Runner B starts at 8:00 AM at 12 km/h. When does B catch A?
# A has 1-hour head start: 8 km ahead.
# Relative speed of B over A = 12-8 = 4 km/h
# Time for B to catch = 8/4 = 2 hours after 8 AM → 10 AM
time_catch_0037 = 8 / (12-8)   # 2 hours after B starts
verify("num-0037", time_catch_0037, 2)
ans_0037 = time_catch_0037   # B catches A 2 hours after B starts (10:00 AM)

# ── Money/Finance problems ────────────────────────────────────────────────────

# num-0038 Medium – simple interest
# ₱50,000 invested at 6% simple interest per year. Interest after 3 years?
ans_0038 = 50000 * 0.06 * 3   # 9,000
verify("num-0038", ans_0038, 9000)

# num-0039 Medium – coins/denomination
# Jessa has ₱1 and ₱5 coins totaling ₱47. She has 23 coins in all. How many ₱5 coins?
# x = ₱5 coins, y = ₱1 coins; x+y=23; 5x+y=47 → 4x=24 → x=6
x_0039 = (47-23) / (5-1)   # 24/4 = 6
verify("num-0039", x_0039, 6)
ans_0039 = x_0039

# num-0040 Hard – compound interest
# ₱100,000 at 8% compounded annually. Amount after 2 years?
ans_0040 = 100000 * (1.08)**2   # 116,640
verify("num-0040", round(ans_0040,2), 116640.0)

# ══════════════════════════════════════════════════════════════════════════════
# BLOCK 5 – Data Interpretation  (5 questions: 0041–0045)
# ══════════════════════════════════════════════════════════════════════════════

# Shared table passage for 0041–0043:
# Employees by Department (MUNICIPALITY OF BAYBAYON)
# Dept | Regular | Casual | Total
# Admin|   12    |   8    |  20
# Finance|  9   |   6    |  15
# Health |  15  |  10    |  25
# Total  |  36  |  24    |  60

# num-0041 Easy – read from table
# Total employees = 60
ans_0041 = 60
verify("num-0041", ans_0041, 60)

# num-0042 Medium – percentage from table
# Casual employees as % of total = 24/60*100 = 40%
ans_0042 = 24/60*100   # 40
verify("num-0042", ans_0042, 40)

# num-0043 Medium – ratio from table
# Ratio regular:casual in Finance = 9:6 = 3:2
# As simplified: 3/2 → correct option: 3:2
ans_0043 = fractions.Fraction(9,6)   # 3/2
verify("num-0043", ans_0043, fractions.Fraction(3,2))

# num-0044 Medium – inference from table (two-table scenario described in text)
# Quarter budget utilization passage (built into question text)
# Q1:480k Q2:520k Q3:450k Q4:550k total=2000k budget=2500k
q_vals = [480000, 520000, 450000, 550000]
total_util = sum(q_vals)   # 2,000,000
budget = 2500000
utilization_pct = total_util / budget * 100   # 80%
verify("num-0044", utilization_pct, 80)
ans_0044 = utilization_pct

# num-0045 Hard – two-condition data interpretation
# Average of Q1 and Q3 vs Q2 and Q4
avg_13 = (480000+450000)/2   # 465,000
avg_24 = (520000+550000)/2   # 535,000
diff_0045 = avg_24 - avg_13   # 70,000
verify("num-0045", diff_0045, 70000)
ans_0045 = diff_0045

# ══════════════════════════════════════════════════════════════════════════════
# BLOCK 6 – Basic Algebra & Averages  (5 questions: 0046–0050)
# ══════════════════════════════════════════════════════════════════════════════

# num-0046 Easy – average
# Scores: 82, 75, 91, 68, 84. Average?
scores_0046 = [82, 75, 91, 68, 84]
ans_0046 = sum(scores_0046)/len(scores_0046)   # 400/5 = 80
verify("num-0046", ans_0046, 80)

# num-0047 Easy – weighted average
# 3 exams: 78, 85, 90. Weights 1:1:2. Weighted average?
# (78+85+2*90)/(1+1+2) = (78+85+180)/4 = 343/4 = 85.75
ans_0047 = (78*1 + 85*1 + 90*2) / 4   # 85.75
verify("num-0047", ans_0047, 85.75)

# num-0048 Medium – linear equation
# 3x – 7 = 2(x + 4). Solve for x.
# 3x-7 = 2x+8 → x=15
ans_0048 = 15
verify("num-0048", 3*15 - 7, 2*(15+4))   # both =38

# num-0049 Medium – finding missing value from average
# Average of 5 numbers is 38. Four of them are 30, 42, 35, 46. Fifth number?
total_0049 = 38 * 5   # 190
known_0049 = 30+42+35+46   # 153
ans_0049 = total_0049 - known_0049   # 37
verify("num-0049", ans_0049, 37)

# num-0050 Hard – system of two equations
# x + y = 20 and 3x – y = 28. Find x and y.
# Adding: 4x=48 → x=12, y=8
x_0050 = (20+28)/4    # 12
y_0050 = 20 - x_0050  # 8
verify("num-0050 x", x_0050, 12)
verify("num-0050 y", y_0050, 8)
verify("num-0050 check", 3*x_0050 - y_0050, 28)
ans_0050 = (x_0050, y_0050)

print("\nAll verifications complete.\n")
