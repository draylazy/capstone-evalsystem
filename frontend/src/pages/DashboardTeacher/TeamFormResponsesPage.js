import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  UserCircle2,
} from "lucide-react";
import TeacherSidebar from "../../components/Sidebar/TeacherSidebar";
import { performanceAPI } from "../../services/api";
import "./Teacher.css";

const TeamFormResponsesPage = () => {
  const { teamId, questionnaireId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [questionGroups, setQuestionGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const result = await performanceAPI.getTeamQuestionnaireResponses(
          teamId,
          questionnaireId
        );
        setData(result);
        setQuestionGroups(buildQuestionGroups(result?.students || []));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [teamId, questionnaireId]);

  const buildQuestionGroups = (students) => {
    const groups = [];
    const indexMap = new Map();

    students.forEach((student) => {
      (student.evaluations || []).forEach((evaluation) => {
        const evaluatorLabel = evaluation.adviserName
          ? `Adviser: ${evaluation.adviserName}`
          : evaluation.evaluatorName
          ? `Evaluator: ${evaluation.evaluatorName}`
          : "Submitted evaluation";

        (evaluation.scores || []).forEach((score) => {
          const questionKey = `${score.sectionTitle || ""}|||${score.questionText}`;
          if (!indexMap.has(questionKey)) {
            const group = {
              questionText: score.questionText,
              sectionTitle: score.sectionTitle,
              responses: [],
            };
            indexMap.set(questionKey, group);
            groups.push(group);
          }

          indexMap.get(questionKey).responses.push({
            studentName: student.studentName,
            evaluatorLabel,
            numericScore: score.numericScore,
            maxScore: score.maxScore,
            textResponse: score.textResponse,
            submittedAt: evaluation.submittedAt,
          });
        });
      });
    });

    return groups;
  };

  const renderQuestionGroups = () => {
    if (!questionGroups?.length) {
      return (
        <div className="section">
          <div className="perf-empty-state">
            <UserCircle2 size={40} className="perf-empty-icon" />
            <p>No responses submitted for this questionnaire.</p>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: "grid", gap: 12 }}>
        {questionGroups.map((group, idx) => (
          <div key={`${group.questionText}-${idx}`} className="section">
            {group.sectionTitle && (
              <div style={{ marginBottom: 10 }}>
                <span className="evaluation-response-section">
                  {group.sectionTitle}
                </span>
              </div>
            )}

            <div className="qa-question-row" style={{ padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: 12 }}>
              <div className="qa-question-top" style={{ marginBottom: 12 }}>
                <span className="qa-question-num">Q{idx + 1}</span>
                <span className="qa-question-text">
                  {group.questionText}
                </span>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {group.responses.map((response, rIdx) => (
                  <div
                    key={`${response.studentName}-${rIdx}`}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ fontSize: 13, color: "var(--dtm-muted)" }}>
                        {response.studentName}
                        {response.evaluatorLabel ? ` · ${response.evaluatorLabel}` : ""}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--dtm-muted)" }}>
                        {response.submittedAt
                          ? new Date(response.submittedAt).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                    <div className={`qa-answer-block${
                      response.numericScore === null &&
                      response.numericScore === undefined &&
                      !response.textResponse
                        ? " is-empty"
                        : ""
                    }`}>
                      {response.numericScore !== null &&
                      response.numericScore !== undefined
                        ? `${response.numericScore}${
                            response.maxScore ? ` / ${response.maxScore}` : ""
                          }`
                        : response.textResponse || "Not answered"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="teacher-container">
      <TeacherSidebar />
      <div className="teacher-content">
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn-secondary btn-sm"
            onClick={() =>
              navigate(`/teacher/performance/team/${teamId}/forms`)
            }
          >
            <ChevronLeft size={14} style={{ marginRight: 4 }} />
            Back
          </button>
          <h1 style={{ margin: 0 }}>
            {data?.questionnaireTitle || "Questionnaire Responses"}
          </h1>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="section">
            <p style={{ color: "var(--dtm-muted)" }}>Loading responses…</p>
          </div>
        ) : (
          <div>{renderQuestionGroups()}</div>
        )}
      </div>
    </div>
  );
};

export default TeamFormResponsesPage;
