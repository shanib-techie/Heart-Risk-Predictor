from lightgbm import LGBMClassifier
import pandas as pd
import joblib

df = pd.read_csv("heart_disease_risk_2026.csv")

df = df.drop(
    columns=["chest_pain_type", "family_history", "patient_id"]
)

df = pd.get_dummies(df, columns=["sex", "smoker_status"])

X = df.drop(columns=["has_heart_disease"])
y = df["has_heart_disease"]


model = LGBMClassifier(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=8,
    random_state=42
)

# Train the model
model.fit(X, y)


# new prediction
n = int(input("ENTER NUMBER OF PATIENTS: "))

for i in range(n):

    print(f"\n------ PATIENT {i+1} ------")

    age = int(input("ENTER AGE: "))
    sex = input("ENTER SEX (Male/Female): ").capitalize()

    resting_bp_systolic = int(input("ENTER RESTING BP SYSTOLIC: "))
    resting_bp_diastolic = int(input("ENTER RESTING BP DIASTOLIC: "))

    cholesterol_total = int(input("ENTER TOTAL CHOLESTEROL: "))
    hdl = int(input("ENTER HDL: "))
    ldl = int(input("ENTER LDL: "))
    triglycerides = int(input("ENTER TRIGLYCERIDES: "))

    fasting_blood_sugar = int(input("ENTER FASTING BLOOD SUGAR: "))
    hba1c = float(input("ENTER HbA1c: "))
    bmi = float(input("ENTER BMI: "))

    resting_heart_rate = int(input("ENTER RESTING HEART RATE: "))
    max_heart_rate_achieved = int(input("ENTER MAX HEART RATE ACHIEVED: "))

    exercise_induced_angina = input(
        "EXERCISE INDUCED ANGINA (True/False): "
    ).capitalize()

    st_depression = float(input("ENTER ST DEPRESSION: "))

    smoker_status = input(
        "SMOKER STATUS (Never/Former/Current): "
    ).capitalize()

    alcohol_units_per_week = float(
        input("ENTER ALCOHOL UNITS PER WEEK: ")
    )

    exercise_minutes_per_week = int(
        input("ENTER EXERCISE MINUTES PER WEEK: ")
    )

    sleep_hours = float(input("ENTER SLEEP HOURS: "))
    stress_score = float(input("ENTER STRESS SCORE: "))

    wearable_owner = input(
        "WEARABLE OWNER (True/False): "
    ).capitalize()

    daily_steps = int(input("ENTER DAILY STEPS: "))
    diet_quality_score = float(
        input("ENTER DIET QUALITY SCORE: ")
    )


    new_patient = pd.DataFrame({
        "age": [age],
        "sex": [sex],

        "resting_bp_systolic": [resting_bp_systolic],
        "resting_bp_diastolic": [resting_bp_diastolic],

        "cholesterol_total": [cholesterol_total],
        "hdl": [hdl],
        "ldl": [ldl],
        "triglycerides": [triglycerides],

        "fasting_blood_sugar": [fasting_blood_sugar],
        "hba1c": [hba1c],
        "bmi": [bmi],

        "resting_heart_rate": [resting_heart_rate],
        "max_heart_rate_achieved": [max_heart_rate_achieved],

        "exercise_induced_angina": [exercise_induced_angina],

        "st_depression": [st_depression],
        "smoker_status": [smoker_status],

        "alcohol_units_per_week": [alcohol_units_per_week],
        "exercise_minutes_per_week": [exercise_minutes_per_week],
        "sleep_hours": [sleep_hours],
        "stress_score": [stress_score],

        "wearable_owner": [wearable_owner],
        "daily_steps": [daily_steps],
        "diet_quality_score": [diet_quality_score]
    })


    # Convert categorical columns into dummy variables
    new_patient = pd.get_dummies(new_patient)

    # Make sure new data has EXACTLY the same columns as training data
    new_patient = new_patient.reindex(columns=X.columns, fill_value=0)


    prediction = model.predict(new_patient)

    # Probability of class 0 and class 1
    probability = model.predict_proba(new_patient)

    prob_0 = probability[0][0] * 100
    prob_1 = probability[0][1] * 100


    print("\n--------------------------------")
    print(f"PATIENT {i+1}")

    if prediction[0] == 1:
        print("Prediction: HAS HEART DISEASE")
    else:
        print("Prediction: NO HEART DISEASE")

    print(f"Probability of NO HEART DISEASE (0): {prob_0:.2f}%")
    print(f"Probability of HAS HEART DISEASE (1): {prob_1:.2f}%")

    print("--------------------------------")


joblib.dump(model, "model.pkl")
joblib.dump(X.columns, "model_columns.pkl")