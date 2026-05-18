import React, { useState, useEffect } from "react";
import TeacherSidebar from "../../components/Sidebar/TeacherSidebar";
import { studentAPI, classAPI } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { usePagination } from "../../hooks/usePagination";
import Pagination from "../../components/Pagination/Pagination";
import "./Teacher.css";

const Students = () => {
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { currentPage, totalPages, paginatedData, goToPage } = usePagination(students, 10);

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await studentAPI.getAllStudents();
      setStudents(data);
    } catch (err) {
      setError('Failed to load students: ' + err.message);
      toast.error('Failed to load students: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const data = await classAPI.getAllClasses();
      setClasses(data);
    } catch (err) {
      toast.error('Failed to load classes');
    }
  };

  return (
    <div className="teacher-container">
      <TeacherSidebar />
      <div className="teacher-content students-page">
        <div className="students-page-title-row">
          <h1>Students</h1>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="section students-section">
          <h2 className="students-section-title">All Students</h2>

          {loading ? (
            <p className="students-empty">Loading students...</p>
          ) : (
            <>
            <div className="students-list-wrap">
            <table className="class-table students-list-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Student ID</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Class</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="students-empty-cell">No students found</td>
                  </tr>
                ) : (
                  paginatedData.map((student) => {
                    const classNames =
                      student.classIds?.length > 0
                        ? student.classIds
                            .map((classId) => classes.find((c) => c.id === classId)?.name)
                            .filter(Boolean)
                            .join(", ")
                        : "N/A";

                    return (
                      <tr key={student.id} className="student-list-row">
                        <td className="s-cell-header">
                          <span className="s-card-name">
                            {student.firstName} {student.lastName}
                          </span>
                          <span className="s-card-id">{student.studentId}</span>
                        </td>
                        <td data-label="Student ID" className="s-cell-desktop-only">
                          {student.studentId}
                        </td>
                        <td data-label="First name" className="s-cell-desktop-only">
                          {student.firstName}
                        </td>
                        <td data-label="Last name" className="s-cell-desktop-only">
                          {student.lastName}
                        </td>
                        <td data-label="Class">{classNames}</td>
                        <td data-label="Email" className="s-cell-email">
                          {student.email || "N/A"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Students;
