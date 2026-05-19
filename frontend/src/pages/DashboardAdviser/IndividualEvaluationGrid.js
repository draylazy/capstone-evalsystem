import React, { useState, useMemo } from "react";
import { generateDecimalRatingRange, generateNumericRange } from "../../utils/ratingUtils";
import "./Adviser.css";

const IndividualEvaluationGrid = ({
  section,
  teamMembers,
  answers,
  onAnswerChange,
  isSubmitted,
  currentItemIndex = 0,
}) => {
  // answers structure: { studentId: { itemId: value } }
  
  const sortedItems = useMemo(() => {
    return (section.items || []).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }, [section.items]);

  const sortedMembers = useMemo(() => {
    return teamMembers || [];
  }, [teamMembers]);

  const currentItem = sortedItems[currentItemIndex];

  const handleChange = (studentId, itemId, value) => {
    if (isSubmitted) return;
    onAnswerChange(studentId, itemId, value);
  };

  const renderScaleButtons = (item, studentId, currentValue) => {
    const isRating = item.questionType === "RATING";
    const range = isRating
      ? generateDecimalRatingRange(item.minScore, item.maxScore)
      : generateNumericRange(item.minScore, item.maxScore);

    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
        {range.map((num) => {
          const isSelected = String(currentValue) === String(num);
          return (
            <label key={num} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '4px', 
              cursor: isSubmitted ? 'default' : 'pointer' 
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: `2px solid ${isSelected ? 'var(--dtm-gold)' : 'rgba(255,255,255,0.15)'}`,
                background: isSelected ? 'rgba(242, 201, 76, 0.2)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}>
                <input 
                  type="radio" 
                  name={`item-${item.id}-student-${studentId}`} 
                  value={num}
                  checked={isSelected}
                  onChange={() => handleChange(studentId, item.id, num)}
                  disabled={isSubmitted}
                  style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'inherit' }}
                />
                {isSelected && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--dtm-gold)' }} />}
              </div>
              <span style={{ fontSize: '0.75rem', color: isSelected ? 'var(--dtm-gold)' : 'var(--dtm-muted)' }}>{num}</span>
            </label>
          );
        })}
      </div>
    );
  };

  const renderTextResponse = (item, studentId, currentValue) => {
    return (
      <textarea
        placeholder="Enter response..."
        value={currentValue || ""}
        onChange={(e) => handleChange(studentId, item.id, e.target.value)}
        disabled={isSubmitted}
        style={{
          width: '100%',
          minHeight: '60px',
          padding: '8px',
          borderRadius: '6px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff',
          fontFamily: 'inherit',
          resize: 'vertical',
          fontSize: '0.9rem'
        }}
      />
    );
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        padding: '20px',
        background: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0 0 8px 0', color: 'var(--dtm-gold)' }}>
          {section.sectionTitle}
        </h3>
        {section.sectionDescription && (
          <p style={{ margin: '8px 0 0 0', color: 'var(--dtm-muted)', fontSize: '0.9rem' }}>
            {section.sectionDescription}
          </p>
        )}
      </div>

      {currentItem && (
        <>
          <div style={{
            padding: '20px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: '500' }}>
              {currentItem.questionText}
              {currentItem.required !== false && <span style={{ color: '#ff4d4f', marginLeft: '4px' }} title="Required">*</span>}
            </h4>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '16px'
          }}>
            {sortedMembers.map((member) => (
              <div
                key={member.studentId}
                style={{
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  background: 'rgba(255,255,255,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  paddingBottom: '10px'
                }}>
                  <h5 style={{ margin: '0 0 2px 0', fontSize: '1rem' }}>
                    {member.firstName} {member.lastName}
                  </h5>
                  <p style={{ margin: '0', fontSize: '0.8rem', color: 'var(--dtm-muted)' }}>
                    {member.studentNumber}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(() => {
                    const currentValue = answers[member.studentId]?.[currentItem.id];
                    
                    return (
                      <>
                        {currentItem.questionType === 'TEXT' ? (
                          renderTextResponse(currentItem, member.studentId, currentValue)
                        ) : currentItem.questionType === 'MULTIPLE_CHOICE' ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {(currentItem.choices || []).map((choice, idx) => {
                              const isSelected = String(currentValue) === String(choice);
                              return (
                                <button
                                  key={idx}
                                  onClick={() => handleChange(member.studentId, currentItem.id, choice)}
                                  disabled={isSubmitted}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '18px',
                                    border: `1px solid ${isSelected ? 'var(--dtm-gold)' : 'rgba(255,255,255,0.1)'}`,
                                    background: isSelected ? 'rgba(242, 201, 76, 0.1)' : 'rgba(255,255,255,0.02)',
                                    color: isSelected ? 'var(--dtm-gold)' : 'var(--dtm-muted)',
                                    cursor: isSubmitted ? 'default' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    fontSize: '0.85rem'
                                  }}
                                >
                                  {choice}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          renderScaleButtons(currentItem, member.studentId, currentValue)
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>

          {/* Progress within individual section */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ color: 'var(--dtm-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>
              Progress: {currentItemIndex + 1} / {sortedItems.length}
            </div>
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
              <div style={{ 
                width: `${((currentItemIndex + 1) / sortedItems.length) * 100}%`, 
                height: '100%', 
                background: 'var(--dtm-gold)', 
                borderRadius: '2px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default IndividualEvaluationGrid;
