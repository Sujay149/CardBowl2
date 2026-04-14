package com.cardbowl.app.service.card;

import com.cardbowl.app.dto.FilterCriteria;
import com.cardbowl.app.dto.card.BusinessCardDTO;
import com.cardbowl.app.dto.card.view.BusinessCardViewDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface BusinessCardService {

    BusinessCardDTO create(BusinessCardDTO request);

    BusinessCardDTO getByKey(String cardKey);

    BusinessCardDTO update(BusinessCardDTO request);

    Page<BusinessCardViewDTO> list(List<FilterCriteria> filters, Pageable pageable);

    void deactivate(String cardKey);

    void activate(String cardKey);
}
