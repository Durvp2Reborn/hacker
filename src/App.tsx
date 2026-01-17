import {useEffect, useState} from "react";

import "./App.css";
import "./index.css";
import { BarcodeScanner } from 'react-barcode-scanner';
import "react-barcode-scanner/polyfill"

interface productResponse {
    name: string;
    upc: string;
    q1: number;
    q2: number;
    q3: number;
    q4: number;
    q5: number;
    overallScore: number;
    totalSurveys: number;
}

function App() {
    const [productData, setProductData] = useState<productResponse>();
    const [barcode, setBarcode] = useState("");
    const [hideScanner, setHideScanner] = useState(false);
    const [requireSurvey, setRequireSurvey] = useState(false);
    const [currQuestion, setCurrQuestion] = useState(0);
    const [currQuizValues] = useState<number[]>([]);
    const [skipSurvey, setSkipSurvey] = useState(false);

    useEffect(() => {
        if (!barcode) return;

        fetch(`https://ecologicapi.onrender.com/api/products/?upc=${barcode}`)
            .then((response) => response.json())
            .then((data) => setProductData(data))
            .catch(console.error);
    }, [barcode]);

    useEffect(() => {
        if (!productData || skipSurvey) return;
        if (productData.totalSurveys < 3) setRequireSurvey(true);
        else setSkipSurvey(true);
    }, [productData]);

    /* ───────────── SCANNER PAGE ───────────── */
    if (!hideScanner) {
        return (
            <div className="page scan-page fade-in">
                <h1 className="glow-title">Product Scanner</h1>

                <div className="scanner-wrapper glass">
                    <BarcodeScanner id="#scanner "options={{ formats: ['upc_a', 'upc_e', 'ean_13', 'ean_8']}} onCapture={(e) => {
                        window.alert(e[0].rawValue);
                        // @ts-expect-error
                        document.getElementById("scanner" as HTMLElement).paused = true;
                    }} />
                </div>

                <div id="containera">
                    <input id="barcodeType" placeholder="Enter barcode manually"/>
                    <button
                        className="button neon"
                        onClick={() => {
                            setBarcode(
                                (document.getElementById("barcodeType") as HTMLInputElement)
                                    .value
                            );
                            setHideScanner(true);
                        }}
                    >
                        Scan
                    </button>
                </div>
            </div>
        );
    }

    /* ───────────── SURVEY PAGE ───────────── */
    if (requireSurvey && productData) {
        const quiz: Question[] = [
            {
                question: "What type of packaging does this primarily use?",
                answers: ["Plastic", "Cardboard", "Aluminum", "Glass"],
                values: [0, 20, 20, 30],
            },
            {
                question: "Does this product use more than one layer of packaging?",
                answers: ["Yes", "No"],
                values: [0, 10],
            },
            {
                question:
                    "Is the waste from this product recyclable or compostable?",
                answers: ["Yes", "Partially", "No"],
                values: [15, 10, 0],
            },
            {
                question: "Is this a meat product?",
                answers: ["Yes", "No"],
                values: [0, 15],
            },
            {
                question: "Where was this product packaged?",
                answers: ["Locally", "Domestically", "Internationally"],
                values: [30, 15, 0],
            },
        ];

        if (currQuestion < quiz.length) {
            return (
                <div className="page survey-page fade-slide">
                    <h1 className="survey-title">Quick Eco Survey</h1>
                    <h2 className="product-name">{productData.name}</h2>

                    <QuestionCard
                        index={currQuestion}
                        question={quiz[currQuestion]}
                        rotator={setCurrQuestion}
                        updater={(e) => currQuizValues.push(e)}
                    />

                    <div className="progress-dots">
                        {quiz.map((_, i) => (
                            <span
                                key={i}
                                className={i <= currQuestion ? "dot active" : "dot"}
                            />
                        ))}
                    </div>
                </div>
            );
        }

        fetch(`https://ecologicapi.onrender.com/api/products/?upc=${barcode}`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                q1: currQuizValues[0],
                q2: currQuizValues[1],
                q3: currQuizValues[2],
                q4: currQuizValues[3],
                q5: currQuizValues[4],
            }),
        })
            .then((r) => r.json())
            .then((data) => {
                setProductData(data);
                setSkipSurvey(true);
            });

        setRequireSurvey(false);
    }

    /* ───────────── RESULTS PAGE ───────────── */
    if (hideScanner && !requireSurvey && productData) {
        return (
            <div className="page results-page fade-up">
                <h1 className="glow-title">{productData.name}</h1>

                <div className="score-ring">
                    <div className="score-inner">
                        <div className="score-value">
                            {productData.overallScore.toFixed(0)}
                        </div>
                        <div className="score-label">Eco Score</div>
                    </div>
                </div>

                <div className="results-grid glass">
                    <Result label="Packaging" value={productData.q1} max={30}/>
                    <Result label="Efficiency" value={productData.q2} max={10}/>
                    <Result label="Waste" value={productData.q3} max={15}/>
                    <Result label="Meat Impact" value={productData.q4} max={15}/>
                    <Result label="Shipping" value={productData.q5} max={30}/>
                </div>

                <p className="survey-count">
                    Based on {productData.totalSurveys} surveys
                </p>
            </div>
        );
    }
}

export default App;

/* ───────── COMPONENTS ───────── */

interface Question {
    question: string;
    answers: string[];
    values: number[];
}

function QuestionCard({
                          index,
                          question,
                          rotator,
                          updater,
                      }: {
    index: number;
    question: Question;
    rotator: (e: number) => void;
    updater: (e: number) => void;
}) {
    return (
        <div className="question-card glass">
            <h2>{question.question}</h2>

            <div className="answer-grid">
                {question.answers.map((a, i) => (
                    <button
                        key={i}
                        className="button answer"
                        data-points={question.values[i]}
                        onClick={(e) => {
                            updater(
                                parseInt(
                                    e.currentTarget.dataset.points as string
                                )
                            );
                            rotator(index + 1);
                        }}
                    >
                        {a}
                    </button>
                ))}
            </div>
        </div>
    );
}

function Result({
                    label,
                    value,
                    max,
                }: {
    label: string;
    value: number;
    max: number;
}) {
    return (
        <div className="result-card">
            <span>{label}</span>
            <strong>
                {value.toFixed(1)} / {max}
            </strong>
        </div>
    );
}
