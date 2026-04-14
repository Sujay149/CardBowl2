package com.cardbowl.app.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
@Getter
@Setter
public abstract class BaseEntityDTO implements Serializable {

    @JsonIgnore
    private Long id;

    private String uniqueKey;

    @JsonIgnore
    private Long createdBy;

    @JsonIgnore
    private Long updatedBy;

    @JsonIgnore
    private Instant createdOn;

    @JsonIgnore
    private Instant updatedOn;

    @JsonIgnore
    private String createdAt;

    @JsonIgnore
    private String updatedAt;
}
