package com.cardbowl.app.common.util;

import com.cardbowl.app.dto.FilterCriteria;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class FilterCriteriaUtil {

    private static final Set<String> PAGINATION_PARAMS = Set.of("page", "size", "sort");

    public static List<FilterCriteria> buildFilterCriteriaList(Map<String, String> params) {
        List<FilterCriteria> filters = new ArrayList<>();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (PAGINATION_PARAMS.contains(entry.getKey())) continue;
            String[] parts = entry.getKey().split("__");
            if (parts.length == 2) {
                filters.add(new FilterCriteria(parts[0], parts[1], entry.getValue()));
            }
        }
        return filters;
    }
}
