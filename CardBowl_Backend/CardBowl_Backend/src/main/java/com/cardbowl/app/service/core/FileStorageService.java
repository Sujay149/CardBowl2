package com.cardbowl.app.service.core;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {
    String storeFile(MultipartFile file, String subdirectory);
    Resource loadFile(String filePath);
    void deleteFile(String filePath);
}
