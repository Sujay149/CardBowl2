package com.cardbowl.app.controller.dashboard;

import com.cardbowl.app.common.ApiResponse;
import com.cardbowl.app.controller.BaseController;
import com.cardbowl.app.dto.dashboard.DashboardSummaryDTO;
import com.cardbowl.app.service.dashboard.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController extends BaseController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<Object>> getSummary() {
        DashboardSummaryDTO summary = dashboardService.getSummary();
        return buildSuccessResponse(HttpStatus.OK, "Dashboard summary retrieved successfully", summary);
    }
}
