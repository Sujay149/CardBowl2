package com.cardbowl.app.service.card;

import com.cardbowl.app.dto.card.VoiceNoteDTO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface VoiceNoteService {

    VoiceNoteDTO upload(String cardKey, MultipartFile file, String label);

    List<VoiceNoteDTO> getByCardKey(String cardKey);

    void delete(String voiceNoteKey);
}
