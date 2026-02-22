package group9.advisor_eval_system.util;

import group9.advisor_eval_system.dto.ImportStudentDTO;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class ExcelImportUtil {
    
    public static List<ImportStudentDTO> parseStudentsFromExcel(MultipartFile file) throws IOException {
        List<ImportStudentDTO> students = new ArrayList<>();
        
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            
            // Skip header row (row 0)
            for (int rowIndex = 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                
                if (row == null || isRowEmpty(row)) {
                    continue;
                }
                
                try {
                    ImportStudentDTO student = new ImportStudentDTO();
                    
                    // Try to detect column positions based on header or use flexible mapping
                    // Support both formats:
                    // Format 1: Student ID, First Name, Last Name, Email, Phone Number
                    // Format 2: Team Code, Member #, Student ID, Last Name, First Name, Email, ...
                    
                    // Check if this looks like format 2 (has Team Code in column 0)
                    String col0 = getCellValueAsString(row.getCell(0)).trim();
                    boolean isFormat2 = col0.contains("-sem") || col0.matches(".*\\d{4}-sem.*");

                    // Skip header-like rows (e.g. "TEAM CODE", "STUDENT ID" text rows)
                    String col0Upper = col0.toUpperCase();
                    if (col0Upper.contains("TEAM") || col0Upper.contains("CODE") || col0Upper.contains("MEMBER")) {
                        continue;
                    }
                    
                    if (isFormat2) {
                        // Format 2: Team Code, Member #, Student ID, Last Name, First Name, Email, ...
                        // Column 2: Student ID
                        Cell studentIdCell = row.getCell(2);
                        if (studentIdCell != null) {
                            student.setStudentId(getCellValueAsString(studentIdCell).trim());
                        }
                        
                        // Column 4: First Name
                        Cell firstNameCell = row.getCell(4);
                        if (firstNameCell != null) {
                            student.setFirstName(getCellValueAsString(firstNameCell).trim());
                        }
                        
                        // Column 3: Last Name
                        Cell lastNameCell = row.getCell(3);
                        if (lastNameCell != null) {
                            student.setLastName(getCellValueAsString(lastNameCell).trim());
                        }
                        
                        // Column 5: Email (optional)
                        Cell emailCell = row.getCell(5);
                        if (emailCell != null) {
                            String email = getCellValueAsString(emailCell).trim();
                            if (!email.isEmpty()) {
                                student.setEmail(email);
                            }
                        }
                    } else {
                        // Format 1: Student ID, First Name, Last Name, Email, Phone Number
                        // Column 0: Student ID
                        Cell studentIdCell = row.getCell(0);
                        if (studentIdCell != null) {
                            student.setStudentId(getCellValueAsString(studentIdCell).trim());
                        }
                        
                        // Column 1: First Name
                        Cell firstNameCell = row.getCell(1);
                        if (firstNameCell != null) {
                            student.setFirstName(getCellValueAsString(firstNameCell).trim());
                        }
                        
                        // Column 2: Last Name
                        Cell lastNameCell = row.getCell(2);
                        if (lastNameCell != null) {
                            student.setLastName(getCellValueAsString(lastNameCell).trim());
                        }
                        
                        // Column 3: Email (optional)
                        Cell emailCell = row.getCell(3);
                        if (emailCell != null) {
                            String email = getCellValueAsString(emailCell).trim();
                            if (!email.isEmpty()) {
                                student.setEmail(email);
                            }
                        }
                        
                        // Column 4: Phone Number (optional)
                        Cell phoneCell = row.getCell(4);
                        if (phoneCell != null) {
                            String phone = getCellValueAsString(phoneCell).trim();
                            if (!phone.isEmpty()) {
                                student.setPhoneNumber(phone);
                            }
                        }
                    }
                    
                    // Validate required fields
                    if (student.getStudentId() != null && !student.getStudentId().isEmpty() &&
                        student.getFirstName() != null && !student.getFirstName().isEmpty() &&
                        student.getLastName() != null && !student.getLastName().isEmpty()) {
                        students.add(student);
                    }
                } catch (Exception e) {
                    throw new RuntimeException("Error parsing row " + (rowIndex + 1) + ": " + e.getMessage());
                }
            }
        }
        
        return students;
    }
    
    private static String getCellValueAsString(Cell cell) {
        if (cell == null) {
            return "";
        }
        
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getDateCellValue().toString();
                } else {
                    return String.valueOf((long) cell.getNumericCellValue());
                }
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                return cell.getCellFormula();
            default:
                return "";
        }
    }
    
    private static boolean isRowEmpty(Row row) {
        if (row == null) {
            return true;
        }
        for (int cellIndex = row.getFirstCellNum(); cellIndex < row.getLastCellNum(); cellIndex++) {
            Cell cell = row.getCell(cellIndex);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                return false;
            }
        }
        return true;
    }
}
