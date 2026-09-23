from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import pandas as pd
import joblib



app = FastAPI()

model = joblib.load("model.pkl")
model_columns = joblib.load("model_columns.pkl")


class Detail(BaseModel):
    age: int
    sex: str

    resting_bp_systolic: int
    resting_bp_diastolic: int

    cholesterol_total: int
    hdl: int
    ldl: int
    triglycerides: int

    fasting_blood_sugar: int
    hba1c: float
    bmi: float

    resting_heart_rate: int
    max_heart_rate_achieved: int

    exercise_induced_angina: str

    st_depression: float
    smoker_status: str

    alcohol_units_per_week: float
    exercise_minutes_per_week: int
    sleep_hours: float
    stress_score: float

    wearable_owner: str
    daily_steps: int
    diet_quality_score: float


@app.post("/prediction")
def heart_prediction(data: Detail):

    df_new = pd.DataFrame([{
        "age": data.age,
        "sex": data.sex,

        "resting_bp_systolic": data.resting_bp_systolic,
        "resting_bp_diastolic": data.resting_bp_diastolic,

        "cholesterol_total": data.cholesterol_total,
        "hdl": data.hdl,
        "ldl": data.ldl,
        "triglycerides": data.triglycerides,

        "fasting_blood_sugar": data.fasting_blood_sugar,
        "hba1c": data.hba1c,
        "bmi": data.bmi,

        "resting_heart_rate": data.resting_heart_rate,
        "max_heart_rate_achieved": data.max_heart_rate_achieved,

        "exercise_induced_angina": data.exercise_induced_angina,

        "st_depression": data.st_depression,
        "smoker_status": data.smoker_status,

        "alcohol_units_per_week": data.alcohol_units_per_week,
        "exercise_minutes_per_week": data.exercise_minutes_per_week,
        "sleep_hours": data.sleep_hours,
        "stress_score": data.stress_score,

        "wearable_owner": data.wearable_owner,
        "daily_steps": data.daily_steps,
        "diet_quality_score": data.diet_quality_score
    }])


    # Convert categorical columns into dummy variables
    df_new = pd.get_dummies(
        df_new
    )


    # Same columns as training data
    df_new = df_new.reindex(
        columns=model_columns,
        fill_value=0
    )


    # Prediction
    prediction = model.predict(df_new)


    # Probability
    probability = model.predict_proba(df_new)

    prob_0 = probability[0][0] * 100
    prob_1 = probability[0][1] * 100


    if prediction[0] == 1:
        result = "HAS HEART DISEASE"
    else:
        result = "NO HEART DISEASE"


    return {
        "prediction": int(prediction[0]),
        "result": result,
        "probability_no_disease": round(prob_0, 2),
        "probability_disease": round(prob_1, 2)
    }


# Static Files
# app.mount("/", StaticFiles(directory="resaleiq-website", html=True), name="static")
app.mount("/", StaticFiles(directory="frontend", html=True), name="static")
