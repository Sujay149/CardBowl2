package com.cardbowl.app.repository.sql.specification;

import com.cardbowl.app.dto.FilterCriteria;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class DynamicSpecification<T> implements Specification<T> {

    private final List<FilterCriteria> filters;

    public DynamicSpecification(List<FilterCriteria> filters) {
        this.filters = filters;
    }

    @Override
    public Predicate toPredicate(Root<T> root, CriteriaQuery<?> query, CriteriaBuilder cb) {
        List<Predicate> predicates = new ArrayList<>();

        for (FilterCriteria filter : filters) {
            Path<?> path = root.get(filter.getField());
            String operation = filter.getOperation();
            String value = filter.getValue();

            switch (operation) {
                case "eq":
                    predicates.add(cb.equal(path, convertValue(path.getJavaType(), value)));
                    break;
                case "neq":
                    predicates.add(cb.notEqual(path, convertValue(path.getJavaType(), value)));
                    break;
                case "lt":
                    predicates.add(cb.lessThan(path.as(Comparable.class), (Comparable) convertValue(path.getJavaType(), value)));
                    break;
                case "gt":
                    predicates.add(cb.greaterThan(path.as(Comparable.class), (Comparable) convertValue(path.getJavaType(), value)));
                    break;
                case "lte":
                    predicates.add(cb.lessThanOrEqualTo(path.as(Comparable.class), (Comparable) convertValue(path.getJavaType(), value)));
                    break;
                case "gte":
                    predicates.add(cb.greaterThanOrEqualTo(path.as(Comparable.class), (Comparable) convertValue(path.getJavaType(), value)));
                    break;
                case "has":
                    predicates.add(cb.like(cb.lower(path.as(String.class)), "%" + value.toLowerCase() + "%"));
                    break;
                case "in":
                    List<String> inValues = Arrays.asList(value.split(","));
                    predicates.add(path.as(String.class).in(inValues));
                    break;
                case "nin":
                    List<String> ninValues = Arrays.asList(value.split(","));
                    predicates.add(cb.not(path.as(String.class).in(ninValues)));
                    break;
                case "isnull":
                    predicates.add(cb.isNull(path));
                    break;
                case "notnull":
                    predicates.add(cb.isNotNull(path));
                    break;
                default:
                    break;
            }
        }

        return cb.and(predicates.toArray(new Predicate[0]));
    }

    private Object convertValue(Class<?> type, String value) {
        if (value == null) return null;
        if (type.equals(Long.class) || type.equals(long.class)) {
            return Long.parseLong(value);
        } else if (type.equals(Boolean.class) || type.equals(boolean.class)) {
            return Boolean.parseBoolean(value);
        } else if (type.equals(LocalDate.class)) {
            return LocalDate.parse(value);
        } else if (type.equals(LocalDateTime.class)) {
            return LocalDateTime.parse(value);
        }
        return value;
    }
}
