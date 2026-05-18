import React, { useRef, useEffect } from "react";

/**
 * Google Forms–style rating grid: members as rows, scores as columns, horizontal scroll.
 */
const RatingGrid = ({
  members,
  item,
  scoreRange,
  answers,
  onScoreChange,
  isSubmitted,
  isRating,
}) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth + 1) return;
      const dY = e.deltaY;
      const dX = e.deltaX;
      if (Math.abs(dX) > Math.abs(dY)) return;
      if (dY === 0) return;
      el.scrollLeft += dY;
      e.preventDefault();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const getCellState = (member, num) => {
    const isSelected =
      String(answers[member.evaluationId]?.[item.id]) === String(num);
    const isChosenByOther =
      isRating &&
      members.some(
        (other) =>
          other.evaluationId !== member.evaluationId &&
          String(answers[other.evaluationId]?.[item.id]) === String(num)
      );
    const isDisabled = isSubmitted || (isChosenByOther && !isSelected);
    return { isSelected, isDisabled };
  };

  return (
    <div className="rating-grid-wrap">
      <p className="rating-grid-hint">
        <span className="rating-grid-hint-icon" aria-hidden="true">↔</span>
        Scroll sideways for more scores
      </p>
      <div
        ref={scrollRef}
        className="rating-grid-scroll"
        tabIndex={0}
        role="group"
        aria-label={`Rating scale for ${item.questionText}`}
      >
        <table className="rating-grid">
          <thead>
            <tr>
              <th scope="col" className="rating-grid-sticky-col rating-grid-corner">
                Member
              </th>
              {scoreRange.map((num) => (
                <th key={num} scope="col" className="rating-grid-score-head">
                  {num}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.id}
                className={member.isMe ? "rating-grid-row--self" : undefined}
              >
                <th scope="row" className="rating-grid-sticky-col">
                  <span className="rating-grid-member-name">{member.name}</span>
                  {member.isMe && (
                    <span className="rating-grid-self-badge">You</span>
                  )}
                </th>
                {scoreRange.map((num) => {
                  const { isSelected, isDisabled } = getCellState(member, num);
                  return (
                    <td key={num} className="rating-grid-score-cell">
                      <label
                        className={`rating-grid-cell${isSelected ? " is-selected" : ""}${isDisabled ? " is-disabled" : ""}`}
                        title={isDisabled && !isSelected ? "Score already used for another member" : undefined}
                      >
                        <input
                          type="radio"
                          name={`member-${member.id}-item-${item.id}`}
                          value={num}
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => {
                            if (!isDisabled) {
                              onScoreChange(member.evaluationId, item.id, num);
                            }
                          }}
                        />
                        <span className="rating-grid-radio" aria-hidden="true" />
                        <span className="sr-only">
                          {member.name}, score {num}
                        </span>
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RatingGrid;
