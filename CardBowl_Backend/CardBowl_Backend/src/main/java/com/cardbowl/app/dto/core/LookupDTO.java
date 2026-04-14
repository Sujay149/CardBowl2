package com.cardbowl.app.dto.core;

import com.cardbowl.app.dto.BaseEntityDTO;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LookupDTO extends BaseEntityDTO {

    private String category;

    private String lookupValue;
}
