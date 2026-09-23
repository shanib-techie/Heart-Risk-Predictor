/*
 * fields.js — the 23 inputs accepted by the FastAPI `Detail` model in main.py.
 *
 * This file is the single source of truth: the Parameters page and the Prediction form
 * are both generated from it, so the explanations and the form can never drift apart.
 *
 * `key`  must match the field name in main.py exactly.
 * `type` matches the Pydantic type:  "int" -> int,  "float" -> float,  "select" -> str.
 * `min` / `max` are only sanity limits that block impossible values (e.g. a negative BMI).
 *        They are NOT medical ranges. Medical reference ranges live in `ref`.
 * `ref`  tag colours:  ok = usually considered normal, watch = borderline, alert = usually considered high/low.
 * `unknown.kind`:  known | measure | lab | test | estimate  (decides the wording of the "don't know" box)
 */

const GROUPS = [
  { id: "personal",  title: "Personal information" },
  { id: "body",      title: "Body measurements" },
  { id: "bp",        title: "Blood pressure" },
  { id: "heart",     title: "Heart and exercise test" },
  { id: "blood",     title: "Blood tests" },
  { id: "lifestyle", title: "Lifestyle" },
  { id: "other",     title: "Activity and diet" },
];

// The prediction form is split into four short steps.
const STEPS = [
  { id: "about",     title: "About you",               groups: ["personal", "body"] },
  { id: "heart",     title: "Heart and blood pressure", groups: ["bp", "heart"] },
  { id: "blood",     title: "Blood tests",             groups: ["blood"] },
  { id: "lifestyle", title: "Lifestyle",               groups: ["lifestyle", "other"] },
];

const YES_NO = [
  { value: "True",  label: "Yes" },
  { value: "False", label: "No" },
];

const FIELDS = [
  // ---------------------------------------------------------------- personal
  {
    key: "age", label: "Age", group: "personal", type: "int", unit: "years", min: 1, max: 120, example: "54",
    hint: "In completed years.",
    meaning: "How old you are, in full years.",
    enter: "A whole number, for example 54.",
    ref: [],
    refNote: "There is no “normal” age range. Heart disease risk generally rises as people get older.",
    source: "Your ID card or date of birth.",
    unknown: { kind: "known", text: "You will know this one. Enter your age in full years, without decimals." },
  },
  {
    key: "sex", label: "Sex", group: "personal", type: "select", options: [
      { value: "Male", label: "Male" }, { value: "Female", label: "Female" },
    ],
    hint: "As recorded in your medical records.",
    meaning: "Biological sex as it appears in medical records. The model was trained with two categories, Male and Female, so no other option can be offered.",
    enter: "Choose Male or Female.",
    ref: [],
    refNote: "Not a measurement, so there is no range.",
    source: "Your medical records.",
    unknown: { kind: "known", text: "You will know this one. Choose the option that matches your medical records." },
  },

  // ---------------------------------------------------------------- body
  {
    key: "bmi", label: "Body mass index (BMI)", group: "body", type: "float", unit: "kg/m²", min: 10, max: 80, step: 0.1, example: "22.9",
    hint: "Weight (kg) ÷ height (m)².",
    meaning: "A single number that relates your weight to your height. It is calculated, not measured directly: BMI = weight in kilograms ÷ (height in metres × height in metres).",
    enter: "A number with one decimal, for example 22.9. Example: 70 kg and 1.75 m gives 70 ÷ (1.75 × 1.75) = 22.9.",
    ref: [
      { tag: "watch", text: "Below 18.5: underweight range" },
      { tag: "ok",    text: "18.5 to 24.9: healthy-weight range" },
      { tag: "watch", text: "25 to 29.9: overweight range" },
      { tag: "alert", text: "30 and above: obesity range" },
    ],
    refNote: "These are the standard adult categories. Some guidelines use lower cut-offs for South and East Asian populations, and BMI does not distinguish muscle from fat.",
    source: "Calculate it from a recent weight and height, or read it from a health check-up report.",
    unknown: { kind: "measure", text: "Weigh yourself and measure your height, then use the formula above. Most health apps and many online calculators do the arithmetic for you." },
  },

  // ---------------------------------------------------------------- blood pressure
  {
    key: "resting_bp_systolic", label: "Resting blood pressure, systolic", group: "bp", type: "int", unit: "mmHg", min: 50, max: 300, example: "120",
    hint: "The upper number of your BP reading.",
    meaning: "The upper number of a blood pressure reading. If your BP is 120/80, then 120 is the systolic value. It is the pressure in your arteries when the heart beats. “Resting” means measured while you were seated and calm.",
    enter: "A whole number, for example 120.",
    ref: [
      { tag: "ok",    text: "Below 120: normal" },
      { tag: "watch", text: "120 to 129: elevated" },
      { tag: "alert", text: "130 and above: high blood pressure range" },
    ],
    refNote: "Adult categories used in US hypertension guidelines. A single reading does not diagnose anything, and it must be higher than the diastolic value.",
    source: "A home BP monitor, a pharmacy or clinic reading, or a health check-up report.",
    unknown: { kind: "measure", text: "Please measure it rather than guess. Sit quietly for five minutes with your arm supported, then take a reading with a BP monitor. Many pharmacies will do this for free." },
  },
  {
    key: "resting_bp_diastolic", label: "Resting blood pressure, diastolic", group: "bp", type: "int", unit: "mmHg", min: 30, max: 200, example: "80",
    hint: "The lower number of your BP reading.",
    meaning: "The lower number of a blood pressure reading. If your BP is 120/80, then 80 is the diastolic value. It is the pressure in your arteries between heartbeats.",
    enter: "A whole number, for example 80. It must be lower than the systolic value.",
    ref: [
      { tag: "ok",    text: "Below 80: normal" },
      { tag: "alert", text: "80 and above: high blood pressure range" },
    ],
    refNote: "Adult categories used in US hypertension guidelines. Other guidelines set the threshold at 90.",
    source: "The same reading as the systolic value.",
    unknown: { kind: "measure", text: "It comes from the same blood pressure reading as the systolic number, so measure both together. Please do not guess." },
  },

  // ---------------------------------------------------------------- heart / exercise test
  {
    key: "resting_heart_rate", label: "Resting heart rate", group: "heart", type: "int", unit: "beats per minute (bpm)", unitShort: "bpm", min: 20, max: 220, example: "72",
    hint: "Pulse while sitting calmly.",
    meaning: "How many times your heart beats in one minute while you are at rest, for example after sitting quietly for five minutes.",
    enter: "A whole number, for example 72.",
    ref: [
      { tag: "ok", text: "60 to 100: typical range for adults" },
    ],
    refNote: "Well-trained athletes often sit below 60 without any problem. A resting rate persistently above 100 is worth discussing with a doctor.",
    source: "A smartwatch or fitness tracker, a BP monitor (most show pulse), or a medical report.",
    unknown: { kind: "measure", text: "You can measure it yourself: rest for five minutes, count the pulse at your wrist for 30 seconds and double it. A BP monitor or smartwatch also shows it." },
  },
  {
    key: "max_heart_rate_achieved", label: "Maximum heart rate achieved", group: "heart", type: "int", unit: "beats per minute (bpm)", unitShort: "bpm", min: 40, max: 250, example: "158",
    hint: "Highest pulse reached during an exercise test.",
    meaning: "The highest heart rate you reached during exercise, most reliably during a treadmill or cycling stress test done by a doctor.",
    enter: "A whole number, for example 158. It cannot be lower than your resting heart rate.",
    ref: [],
    refNote: "There is no single normal value. It depends mainly on age and effort. A common rough estimate of the ceiling is 220 minus your age, but that is only an estimate.",
    source: "An exercise stress test (treadmill or TMT) report. A fitness tracker also records your highest pulse during workouts.",
    unknown: { kind: "test", text: "The best source is a stress test report. A fitness tracker’s peak during a hard workout is a rough substitute. Avoid entering the “220 minus age” formula: it is an estimate, and the model would treat it as a real measurement." },
  },
  {
    key: "st_depression", label: "ST depression", group: "heart", type: "float", unit: "mm", min: 0, max: 10, step: 0.1, example: "0.0",
    hint: "From an exercise ECG. 0 means none.",
    meaning: "On an ECG, the ST segment is a flat stretch of the heartbeat trace. During exercise it can dip below its resting level. ST depression is the size of that dip, in millimetres. It is measured by an exercise ECG (stress test).",
    enter: "A number with one decimal, for example 1.2. Enter 0 only if your report says there was no ST depression.",
    ref: [
      { tag: "ok",    text: "0: no dip" },
      { tag: "alert", text: "1 mm or more of horizontal or downsloping dip is commonly read as an abnormal response" },
    ],
    refNote: "Interpreting an ECG depends on the shape of the dip as well as its size, which is why this is a job for a doctor.",
    source: "The result section of an exercise ECG / treadmill test (TMT) report, sometimes written as “ST depression” or “ST segment change”.",
    unknown: { kind: "test", text: "If you have never had an exercise ECG, this value does not exist for you. Do not enter 0 as a stand-in for “don’t know”: the model would read it as “no dip found”." },
  },
  {
    key: "exercise_induced_angina", label: "Exercise-induced angina", group: "heart", type: "select", options: YES_NO,
    hint: "Chest pain or pressure triggered by exertion.",
    meaning: "Angina is chest pain, tightness or pressure that happens when the heart muscle does not get enough blood. “Exercise-induced” means it is brought on by physical effort such as climbing stairs or brisk walking, and usually eases with rest.",
    enter: "Choose Yes if exertion brings on this kind of chest discomfort, otherwise No.",
    ref: [],
    refNote: "Not a measurement, so there is no range. Any new or worsening chest pain on exertion should be checked by a doctor.",
    source: "Your own experience, or a doctor’s or stress test report.",
    unknown: { kind: "estimate", text: "If you are unsure whether your chest discomfort counts as angina, ask a doctor rather than choosing at random. If you never feel chest pain or pressure when you exert yourself, choose No." },
  },

  // ---------------------------------------------------------------- blood tests
  {
    key: "cholesterol_total", label: "Total cholesterol", group: "blood", type: "int", unit: "mg/dL", min: 50, max: 700, example: "190",
    hint: "From a lipid profile blood test.",
    meaning: "The total amount of cholesterol in your blood, adding up HDL (“good”), LDL (“bad”) and other types. Cholesterol is a fatty substance your body needs, but high levels can build up in artery walls.",
    enter: "A whole number in mg/dL, for example 190.",
    ref: [
      { tag: "ok",    text: "Below 200: desirable" },
      { tag: "watch", text: "200 to 239: borderline high" },
      { tag: "alert", text: "240 and above: high" },
    ],
    refNote: "General adult reference values. Your doctor may set a different target based on your other risk factors.",
    convert: "Report in mmol/L? Multiply by 38.67 to get mg/dL.",
    source: "A lipid profile (lipid panel) blood test report.",
    unknown: { kind: "lab", text: "Please do not guess this. Look for a “lipid profile” in a recent blood test report. If you do not have one, a lab can run it, usually with a simple blood draw." },
  },
  {
    key: "hdl", label: "HDL cholesterol", group: "blood", type: "int", unit: "mg/dL", min: 10, max: 200, example: "55",
    hint: "The “good” cholesterol.",
    meaning: "High-density lipoprotein. It carries cholesterol away from your arteries back to the liver, which is why it is called “good” cholesterol. For HDL, higher is generally better.",
    enter: "A whole number in mg/dL, for example 55.",
    ref: [
      { tag: "alert", text: "Below 40 (men) or below 50 (women): low" },
      { tag: "ok",    text: "60 and above: high, which is considered favourable" },
    ],
    refNote: "General adult reference values. The values in between are not classed as low or high.",
    convert: "Report in mmol/L? Multiply by 38.67 to get mg/dL.",
    source: "A lipid profile blood test report.",
    unknown: { kind: "lab", text: "Please do not guess this. It is listed in the same lipid profile as total cholesterol." },
  },
  {
    key: "ldl", label: "LDL cholesterol", group: "blood", type: "int", unit: "mg/dL", min: 20, max: 400, example: "110",
    hint: "The “bad” cholesterol.",
    meaning: "Low-density lipoprotein. It is the main type of cholesterol that can settle in artery walls, which is why it is called “bad” cholesterol. For LDL, lower is generally better.",
    enter: "A whole number in mg/dL, for example 110.",
    ref: [
      { tag: "ok",    text: "Below 100: optimal" },
      { tag: "ok",    text: "100 to 129: near optimal" },
      { tag: "watch", text: "130 to 159: borderline high" },
      { tag: "alert", text: "160 and above: high" },
    ],
    refNote: "General adult reference values. People with existing heart disease or diabetes are often given lower targets.",
    convert: "Report in mmol/L? Multiply by 38.67 to get mg/dL.",
    source: "A lipid profile blood test report. Some labs calculate it, others measure it directly.",
    unknown: { kind: "lab", text: "Please do not guess this. It is listed in the same lipid profile as total cholesterol." },
  },
  {
    key: "triglycerides", label: "Triglycerides", group: "blood", type: "int", unit: "mg/dL", min: 20, max: 3000, example: "130",
    hint: "Fat in the blood, from a lipid profile.",
    meaning: "Triglycerides are a type of fat carried in your blood. Your body stores calories you do not use straight away as triglycerides. Levels are affected by recent meals, alcohol and sugar intake.",
    enter: "A whole number in mg/dL, for example 130.",
    ref: [
      { tag: "ok",    text: "Below 150: normal" },
      { tag: "watch", text: "150 to 199: borderline high" },
      { tag: "alert", text: "200 and above: high" },
    ],
    refNote: "General adult reference values, usually for a fasting sample.",
    convert: "Report in mmol/L? Multiply by 88.57 to get mg/dL.",
    source: "A lipid profile blood test report.",
    unknown: { kind: "lab", text: "Please do not guess this. It is listed in the same lipid profile as total cholesterol." },
  },
  {
    key: "fasting_blood_sugar", label: "Fasting blood sugar", group: "blood", type: "int", unit: "mg/dL", min: 30, max: 600, example: "92",
    hint: "The number itself, not yes/no.",
    meaning: "The amount of sugar (glucose) in your blood after you have not eaten for at least 8 hours, usually first thing in the morning. It is used to check how well your body handles sugar.",
    enter: "The measured number in mg/dL, for example 92. This is the actual value, not a yes/no answer.",
    ref: [
      { tag: "ok",    text: "70 to 99: normal" },
      { tag: "watch", text: "100 to 125: prediabetes range" },
      { tag: "alert", text: "126 and above: diabetes range (confirmed by repeat testing)" },
    ],
    refNote: "General adult reference values for a fasting sample.",
    convert: "Report in mmol/L? Multiply by 18 to get mg/dL.",
    source: "A “fasting blood sugar” or “fasting plasma glucose” result in a blood test report, or a glucometer reading taken after fasting.",
    unknown: { kind: "lab", text: "Please do not guess this. A fasting reading needs at least 8 hours without food. If you have a glucometer, you can measure it first thing in the morning; otherwise ask for it in a blood test." },
  },
  {
    key: "hba1c", label: "HbA1c", group: "blood", type: "float", unit: "%", min: 3, max: 20, step: 0.1, example: "5.4",
    hint: "Average blood sugar over about 3 months.",
    meaning: "A blood test that shows your average blood sugar over roughly the last three months. It is reported as a percentage, and it does not require fasting.",
    enter: "A number with one decimal, for example 5.4.",
    ref: [
      { tag: "ok",    text: "Below 5.7%: normal" },
      { tag: "watch", text: "5.7% to 6.4%: prediabetes range" },
      { tag: "alert", text: "6.5% and above: diabetes range" },
    ],
    refNote: "General adult reference values. Targets differ for people who already have diabetes.",
    convert: "Report in mmol/mol? Use % = 0.0915 × mmol/mol + 2.15.",
    source: "A blood test report listed as HbA1c, A1c or glycated haemoglobin.",
    unknown: { kind: "lab", text: "Please do not guess this. HbA1c is a specific blood test, common in diabetes check-ups and full-body health packages." },
  },

  // ---------------------------------------------------------------- lifestyle
  {
    key: "smoker_status", label: "Smoking status", group: "lifestyle", type: "select", options: [
      { value: "Never", label: "Never smoked" }, { value: "Former", label: "Former smoker" }, { value: "Current", label: "Current smoker" },
    ],
    hint: "Choose the closest match.",
    meaning: "Whether you smoke or have smoked tobacco.",
    enter: "Never smoked, Former smoker (you have stopped), or Current smoker.",
    ref: [],
    refNote: "Not a measurement, so there is no range. Smoking is an established risk factor for heart disease.",
    source: "You know this one.",
    unknown: { kind: "known", text: "You will know this one. Choose the option that best describes your history." },
  },
  {
    key: "alcohol_units_per_week", label: "Alcohol per week", group: "lifestyle", type: "float", unit: "units per week", unitShort: "units/wk", min: 0, max: 200, step: 0.1, example: "4",
    hint: "0 if you do not drink.",
    meaning: "How much alcohol you drink in a typical week, counted in units. In the UK definition one unit is 10 ml (8 g) of pure alcohol, roughly a small 25 ml shot of spirits, or about half a standard glass of wine.",
    enter: "A number, for example 4. Enter 0 if you do not drink.",
    ref: [],
    refNote: "There is no “normal” intake. For reference, UK guidance advises keeping to no more than 14 units a week. The definition of a unit differs between countries.",
    source: "Your own drinking habits.",
    unknown: { kind: "estimate", text: "A fair estimate of a typical week is fine here. Think about a normal week rather than the best or worst one." },
  },
  {
    key: "exercise_minutes_per_week", label: "Exercise per week", group: "lifestyle", type: "int", unit: "minutes per week", unitShort: "min/wk", min: 0, max: 10080, example: "150",
    hint: "Total minutes of deliberate exercise.",
    meaning: "The total number of minutes you spend on deliberate exercise in a typical week, such as brisk walking, jogging, cycling, sports or gym sessions.",
    enter: "A whole number of minutes, for example 150. Add up the week: 30 minutes on five days is 150.",
    ref: [],
    refNote: "There is no single normal. For reference, the WHO recommends adults do at least 150 to 300 minutes of moderate-intensity activity per week.",
    source: "Your own routine, or the weekly summary in a fitness app.",
    unknown: { kind: "estimate", text: "A fair estimate of a typical week is fine here. Enter 0 if you do not exercise." },
  },
  {
    key: "sleep_hours", label: "Sleep", group: "lifestyle", type: "float", unit: "hours per night", unitShort: "hours", min: 1, max: 24, step: 0.1, example: "7",
    hint: "Average per night.",
    meaning: "How many hours you usually sleep in a night, on average.",
    enter: "A number, for example 7 or 6.5.",
    ref: [
      { tag: "ok", text: "7 or more hours: recommended for most adults" },
    ],
    refNote: "Needs vary from person to person. Sleep experts recommend at least 7 hours for adults.",
    source: "Your own routine, or a sleep tracker or smartwatch.",
    unknown: { kind: "estimate", text: "A fair estimate of a typical night is fine here." },
  },
  {
    key: "stress_score", label: "Stress score", group: "lifestyle", type: "float", unit: "score", min: 0, step: 0.1,
    scale: null, // TODO: after checking your dataset, put its scale here, e.g. "0 to 10". If model_stats.json has feature_ranges, that is shown automatically.
    hint: "Higher means more stress.",
    meaning: "A self-rated score for how stressed you usually feel, where a higher score means more stress. It is a subjective rating, not a lab test.",
    enter: "Use the same scale as the training data. The range seen in the training data is shown under the input once model_stats.json has been generated.",
    ref: [],
    refNote: "This is a rating, not a medical measurement, so there is no normal range.",
    source: "Your own rating.",
    unknown: { kind: "estimate", text: "A fair self-rating of how you usually feel is fine here. Think about a typical few weeks." },
  },

  // ---------------------------------------------------------------- other
  {
    key: "wearable_owner", label: "Do you own a wearable?", group: "other", type: "select", options: YES_NO,
    hint: "Smartwatch or fitness tracker.",
    meaning: "Whether you own a wearable device such as a smartwatch or fitness band.",
    enter: "Choose Yes or No.",
    ref: [],
    refNote: "Not a measurement, so there is no range.",
    source: "You know this one.",
    unknown: { kind: "known", text: "You will know this one." },
  },
  {
    key: "daily_steps", label: "Daily steps", group: "other", type: "int", unit: "steps per day", unitShort: "steps", min: 0, max: 100000, example: "6500",
    hint: "Average per day.",
    meaning: "The average number of steps you take in a day.",
    enter: "A whole number, for example 6500.",
    ref: [],
    refNote: "There is no single normal. 10,000 steps a day is a popular target, but health benefits start well below it.",
    source: "The step counter in your phone or watch, or a health app’s weekly average.",
    unknown: { kind: "estimate", text: "Check the weekly average in your phone’s health app. If you do not use one, a fair estimate is fine." },
  },
  {
    key: "diet_quality_score", label: "Diet quality score", group: "other", type: "float", unit: "score", min: 0, step: 0.1,
    scale: null, // TODO: after checking your dataset, put its scale here, e.g. "0 to 10".
    hint: "Higher means a healthier diet.",
    meaning: "A self-rated score for how healthy your usual diet is, where a higher score means a healthier diet. It is a subjective rating, not a lab test.",
    enter: "Use the same scale as the training data. The range seen in the training data is shown under the input once model_stats.json has been generated.",
    ref: [],
    refNote: "This is a rating, not a medical measurement, so there is no normal range.",
    source: "Your own rating.",
    unknown: { kind: "estimate", text: "A fair self-rating of your usual eating is fine here. Think about vegetables, fruit, whole grains, and how often you eat processed or fried food." },
  },
];

// Labels for model columns that are not API fields (used by the importance chart).
const EXTRA_LABELS = {
  family_history: "Family history",
  chest_pain_type: "Chest pain type",
};

// Heading and tone for the "don't know this value" box.
const UNKNOWN_TITLES = {
  known:    "Not sure?",
  measure:  "Don’t know this value? Measure it, don’t guess.",
  lab:      "Don’t know this value? Don’t guess it.",
  test:     "Don’t know this value?",
  estimate: "Not sure? An honest estimate is fine.",
};
