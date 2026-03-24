package group9.advisor_eval_system.service;

import group9.advisor_eval_system.entity.User;
import group9.advisor_eval_system.entity.SchoolClass;
import group9.advisor_eval_system.entity.Team;
import group9.advisor_eval_system.repository.UserRepository;
import group9.advisor_eval_system.repository.SchoolClassRepository;
import group9.advisor_eval_system.repository.TeamRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class UserManagementService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SchoolClassRepository schoolClassRepository;

    @Autowired
    private TeamRepository teamRepository;

    public static class UploadResult {
        private int added;
        private int updated;
        private int skipped;
        private List<String> errors;

        public UploadResult(int added, int updated, int skipped, List<String> errors) {
            this.added = added;
            this.updated = updated;
            this.skipped = skipped;
            this.errors = errors;
        }

        public int getAdded() { return added; }
        public int getUpdated() { return updated; }
        public int getSkipped() { return skipped; }
        public List<String> getErrors() { return errors; }
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        userRepository.delete(user);
    }

    /**
     * Upload users from CSV/Excel file
     * Expected columns: Email, FirstName, LastName, Role, PhoneNumber(optional), Department(optional)
     */
    public UploadResult uploadUserSheet(MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename();
        List<String[]> rows;

        if (filename != null && filename.toLowerCase().endsWith(".csv")) {
            rows = parseCsv(file);
        } else {
            rows = parseExcel(file);
        }

        int added = 0, updated = 0, skipped = 0;
        List<String> errors = new ArrayList<>();

        for (int i = 0; i < rows.size(); i++) {
            String[] row = rows.get(i);
            if (row.length < 4) {
                errors.add("Row " + (i + 2) + ": Not enough columns (need Email, FirstName, LastName, Role)");
                skipped++;
                continue;
            }

            String email = row[0].trim().toLowerCase();
            String firstName = row[1].trim();
            String lastName = row[2].trim();
            String roleStr = row[3].trim().toUpperCase();
            String phoneNumber = row.length > 4 ? row[4].trim() : null;
            String department = row.length > 5 ? row[5].trim() : null;

            if (email.isEmpty() || firstName.isEmpty() || lastName.isEmpty()) {
                errors.add("Row " + (i + 2) + ": Email, FirstName, and LastName are required");
                skipped++;
                continue;
            }

            // Parse role
            User.UserRole role;
            try {
                role = User.UserRole.valueOf(roleStr);
            } catch (IllegalArgumentException e) {
                errors.add("Row " + (i + 2) + ": Unknown role '" + roleStr + "' for email " + email
                        + " (valid: TEACHER, ADVISER, STUDENT)");
                skipped++;
                continue;
            }

            // Don't allow modifying the system teacher admin via upload
            if (email.equals("authortet@gmail.com")) {
                skipped++;
                continue;
            }

            if (userRepository.existsByEmail(email)) {
                // Update existing user
                User existing = userRepository.findByEmail(email).get();
                existing.setFirstName(firstName);
                existing.setLastName(lastName);
                existing.setRole(role);
                if (phoneNumber != null && !phoneNumber.isEmpty()) {
                    existing.setPhoneNumber(phoneNumber);
                }
                if (department != null && !department.isEmpty()) {
                    existing.setDepartment(department);
                }
                userRepository.save(existing);
                updated++;
            } else {
                // Create new user
                User newUser = new User();
                newUser.setEmail(email);
                newUser.setFirstName(firstName);
                newUser.setLastName(lastName);
                newUser.setRole(role);
                newUser.setIsActive(true);
                if (phoneNumber != null && !phoneNumber.isEmpty()) {
                    newUser.setPhoneNumber(phoneNumber);
                }
                if (department != null && !department.isEmpty()) {
                    newUser.setDepartment(department);
                }
                userRepository.save(newUser);
                added++;
            }
        }

        return new UploadResult(added, updated, skipped, errors);
    }

    /**
     * Upload advisers from CSV/Excel file
     * Expected columns: ADVISERID, LASTNAME, FIRSTNAME, EMAIL
     */
    public UploadResult uploadAdviserSheet(MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename();
        List<String[]> rows;

        if (filename != null && filename.toLowerCase().endsWith(".csv")) {
            rows = parseCsv(file);
        } else {
            rows = parseExcel(file);
        }

        int added = 0, updated = 0, skipped = 0;
        List<String> errors = new ArrayList<>();

        for (int i = 0; i < rows.size(); i++) {
            String[] row = rows.get(i);
            if (row.length < 4) {
                errors.add("Row " + (i + 2) + ": Not enough columns (need ADVISERID, LASTNAME, FIRSTNAME, EMAIL)");
                skipped++;
                continue;
            }

            String adviserId = row[0].trim();
            String lastName = row[1].trim();
            String firstName = row[2].trim();
            String email = row[3].trim().toLowerCase();

            if (adviserId.isEmpty() || lastName.isEmpty() || firstName.isEmpty() || email.isEmpty()) {
                errors.add("Row " + (i + 2) + ": ADVISERID, LASTNAME, FIRSTNAME, and EMAIL are required");
                skipped++;
                continue;
            }

            // Don't allow modifying the system teacher admin via upload
            if (email.equals("authortet@gmail.com")) {
                skipped++;
                continue;
            }

            if (userRepository.existsByEmail(email)) {
                // Update existing adviser
                User existing = userRepository.findByEmail(email).get();
                existing.setFirstName(firstName);
                existing.setLastName(lastName);
                existing.setRole(User.UserRole.ADVISER);
                userRepository.save(existing);
                updated++;
            } else {
                // Create new adviser
                User newAdviser = new User();
                newAdviser.setEmail(email);
                newAdviser.setFirstName(firstName);
                newAdviser.setLastName(lastName);
                newAdviser.setRole(User.UserRole.ADVISER);
                newAdviser.setIsActive(true);
                userRepository.save(newAdviser);
                added++;
            }
        }

        return new UploadResult(added, updated, skipped, errors);
    }

    /**
     * Upload students from CSV/Excel file
     * Expected columns: CLASS, TEAMCODE, MEMBER#, STUDENTID, LASTNAME, FIRSTNAME, EMAIL, ADVISERID
     */
    public UploadResult uploadStudentSheet(MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename();
        List<String[]> rows;

        if (filename != null && filename.toLowerCase().endsWith(".csv")) {
            rows = parseCsv(file);
        } else {
            rows = parseExcel(file);
        }

        int added = 0, updated = 0, skipped = 0;
        List<String> errors = new ArrayList<>();

        for (int i = 0; i < rows.size(); i++) {
            String[] row = rows.get(i);
            if (row.length < 8) {
                errors.add("Row " + (i + 2) + ": Not enough columns (need CLASS, TEAMCODE, MEMBER#, STUDENTID, LASTNAME, FIRSTNAME, EMAIL, ADVISERID)");
                skipped++;
                continue;
            }

            String className = row[0].trim();
            String teamCode = row[1].trim();
            String memberNum = row[2].trim();
            String studentId = row[3].trim();
            String lastName = row[4].trim();
            String firstName = row[5].trim();
            String email = row[6].trim().toLowerCase();
            String adviserIdStr = row[7].trim();

            if (className.isEmpty() || studentId.isEmpty() || lastName.isEmpty() || firstName.isEmpty() || email.isEmpty() || adviserIdStr.isEmpty()) {
                errors.add("Row " + (i + 2) + ": CLASS, STUDENTID, LASTNAME, FIRSTNAME, EMAIL, and ADVISERID are required");
                skipped++;
                continue;
            }

            // Validate adviser exists (by ID)
            Long adviserId;
            try {
                adviserId = Long.parseLong(adviserIdStr);
            } catch (NumberFormatException e) {
                errors.add("Row " + (i + 2) + ": ADVISERID must be a number, got '" + adviserIdStr + "'");
                skipped++;
                continue;
            }

            Optional<User> adviserOpt = userRepository.findById(adviserId);
            if (!adviserOpt.isPresent()) {
                errors.add("Row " + (i + 2) + ": Adviser with ID " + adviserIdStr + " not found in system");
                skipped++;
                continue;
            }
            User adviser = adviserOpt.get();

            try {
                // Get or create class (available to all teachers)
                SchoolClass schoolClass = getOrCreateClass(className);

                // Get or create team
                Team team = getOrCreateTeam(teamCode, schoolClass);

                // Add adviser to team if not already assigned
                if (!team.getAdvisers().contains(adviser)) {
                    team.getAdvisers().add(adviser);
                    teamRepository.save(team);
                }

                // Create or update student user
                if (userRepository.existsByEmail(email)) {
                    User existing = userRepository.findByEmail(email).get();
                    existing.setFirstName(firstName);
                    existing.setLastName(lastName);
                    existing.setRole(User.UserRole.STUDENT);
                    userRepository.save(existing);
                    updated++;
                } else {
                    User newStudent = new User();
                    newStudent.setEmail(email);
                    newStudent.setFirstName(firstName);
                    newStudent.setLastName(lastName);
                    newStudent.setRole(User.UserRole.STUDENT);
                    newStudent.setIsActive(true);
                    userRepository.save(newStudent);
                    added++;
                }
            } catch (Exception e) {
                errors.add("Row " + (i + 2) + ": Error processing student: " + e.getMessage());
                skipped++;
            }
        }

        return new UploadResult(added, updated, skipped, errors);
    }

    /**
     * Get existing class or create new one (available to all teachers)
     */
    private SchoolClass getOrCreateClass(String className) {
        // Try to find class by name (not restricted by teacher)
        // Get all classes and search by name
        List<SchoolClass> allClasses = schoolClassRepository.findAll();
        for (SchoolClass c : allClasses) {
            if (c.getName().equalsIgnoreCase(className)) {
                return c;
            }
        }

        // Create new class if not found
        SchoolClass newClass = new SchoolClass();
        newClass.setName(className);
        // Use first available teacher or create without specific teacher assignment
        List<User> teachers = userRepository.findByRole(User.UserRole.TEACHER);
        if (!teachers.isEmpty()) {
            newClass.setTeacher(teachers.get(0));
        }
        newClass.setSchoolYear("2024-2025"); // Default school year
        newClass.setIsActive(true);
        return schoolClassRepository.save(newClass);
    }

    /**
     * Get existing team or create new one
     */
    private Team getOrCreateTeam(String teamCode, SchoolClass schoolClass) {
        // Try to find team with this code in the class
        List<Team> teams = teamRepository.findBySchoolClassId(schoolClass.getId());
        for (Team t : teams) {
            if (t.getName().equalsIgnoreCase(teamCode)) {
                return t;
            }
        }

        // Create new team if not found
        Team newTeam = new Team();
        newTeam.setName(teamCode);
        newTeam.setSchoolClass(schoolClass);
        newTeam.setIsActive(true);
        return teamRepository.save(newTeam);
    }

    private List<String[]> parseCsv(MultipartFile file) throws IOException {
        List<String[]> rows = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            boolean firstLine = true;
            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                String[] cols = line.split(",", -1);
                for (int i = 0; i < cols.length; i++) {
                    cols[i] = cols[i].trim().replaceAll("^\"|\"$", "");
                }
                // Skip header row
                if (firstLine) {
                    firstLine = false;
                    String first = cols[0].toUpperCase();
                    if (first.contains("EMAIL") || first.contains("NAME") || first.contains("USER")) continue;
                }
                rows.add(cols);
            }
        }
        return rows;
    }

    private List<String[]> parseExcel(MultipartFile file) throws IOException {
        List<String[]> rows = new ArrayList<>();
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            for (int rowIndex = 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null) continue;
                
                String email = getCellString(row.getCell(0));
                String firstName = getCellString(row.getCell(1));
                String lastName = getCellString(row.getCell(2));
                String role = getCellString(row.getCell(3));
                String phoneNumber = getCellString(row.getCell(4));
                String department = getCellString(row.getCell(5));
                
                if (email.isEmpty()) continue;
                rows.add(new String[]{email, firstName, lastName, role, phoneNumber, department});
            }
        }
        return rows;
    }

    private String getCellString(Cell cell) {
        if (cell == null) return "";
        switch (cell.getCellType()) {
            case STRING: return cell.getStringCellValue().trim();
            case NUMERIC: return String.valueOf((long) cell.getNumericCellValue());
            default: return "";
        }
    }
}
