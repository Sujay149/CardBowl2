package com.cardbowl.app.common.util;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

public class CommonUtil {

    public static final int DEFAULT_PAGE_SIZE = 50;

    private static final String ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    public static String generateUniqueKey(Long id) {
        StringBuilder sb = new StringBuilder();
        int prefixLength = 15 - String.valueOf(id).length();
        for (int i = 0; i < prefixLength; i++) {
            sb.append(ALPHANUMERIC.charAt(RANDOM.nextInt(ALPHANUMERIC.length())));
        }
        sb.append(id);
        return sb.toString();
    }

    public static LocalDateTime getCurrentDateTimeInIST() {
        return LocalDateTime.now(ZoneId.of("Asia/Kolkata"));
    }

    public static LocalDate getCurrentDateInIST() {
        return LocalDate.now(ZoneId.of("Asia/Kolkata"));
    }
}
