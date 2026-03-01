package group9.advisor_eval_system.service;

import group9.advisor_eval_system.entity.AllowedUser;
import group9.advisor_eval_system.entity.User;
import group9.advisor_eval_system.repository.AllowedUserRepository;
import group9.advisor_eval_system.repository.UserRepository;
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

@Service
public class AdminService {

    @Autowired
    private AllowedUserRepository allowedUserRepository;

    @Autowired
    private UserRepository userRepository;

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

    public List<AllowedUser> getAllAllowedUsers() {
        return allowedUserRepository.findAll();
    }

    public void deleteAllowedUser(Long id) {
        AllowedUser au = allowedUserRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Allowed user not found"));
        allowedUserRepository.delete(au);
    }

    public UploadResult uploadRoleSheet(MultipartFile file) throws IOException {
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
            if (row.length < 2) {
                errors.add("Row " + (i + 2) + ": Not enough columns (need Email, Role)");
                skipped++;
                continue;
            }

            String email = row[0].trim().toLowerCase();
            String roleStr = row[1].trim().toUpperCase();

            if (email.isEmpty()) {
                skipped++;
                continue;
            }

            // Parse role
            User.UserRole role;
            try {
                // Accept common aliases
                if (roleStr.equals("STUDENT")) roleStr = "ADVISER"; // map STUDENT -> ADVISER if needed
                role = User.UserRole.valueOf(roleStr);
            } catch (IllegalArgumentException e) {
                errors.add("Row " + (i + 2) + ": Unknown role '" + row[1].trim() + "' for email " + email
                        + " (valid: ADMIN, TEACHER, ADVISER)");
                skipped++;
                continue;
            }

            // Don't allow modifying the system admin via upload
            if (email.equals("admin@system.com")) {
                skipped++;
                continue;
            }

            if (allowedUserRepository.existsByEmail(email)) {
                AllowedUser existing = allowedUserRepository.findByEmail(email).get();
                existing.setAssignedRole(role);
                allowedUserRepository.save(existing);
                // Also update role on the actual user account if already registered
                userRepository.findByEmail(email).ifPresent(u -> {
                    u.setRole(role);
                    userRepository.save(u);
                });
                updated++;
            } else {
                AllowedUser au = new AllowedUser();
                au.setEmail(email);
                au.setAssignedRole(role);
                au.setIsRegistered(userRepository.existsByEmail(email));
                allowedUserRepository.save(au);
                added++;
            }
        }

        return new UploadResult(added, updated, skipped, errors);
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
                String role = getCellString(row.getCell(1));
                if (email.isEmpty()) continue;
                rows.add(new String[]{email, role});
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
