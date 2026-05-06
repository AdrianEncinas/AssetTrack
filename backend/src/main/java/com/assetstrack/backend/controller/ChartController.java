package com.assetstrack.backend.controller;

import java.util.concurrent.CompletableFuture;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.assetstrack.backend.model.dto.ChartDTO;
import com.assetstrack.backend.service.IPortfolioApiService;
import com.assetstrack.backend.service.PortfolioApiService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;


@RestController
@RequestMapping("/api/v1/chart")
@Tag(name = "Charts", description = "Operaciones para obtener datos de gráficos de acciones")
public class ChartController {

    private final IPortfolioApiService portfolioApiService;

    public ChartController(PortfolioApiService portfolioApiService){
        this.portfolioApiService = portfolioApiService;
    }

    @Operation(summary = "Obtener gráfico de una acción", description = "Retorna datos históricos de precio para un ticker y período dados")
    @ApiResponse(responseCode = "200", description = "Datos del gráfico obtenidos",
            content = @Content(schema = @Schema(implementation = ChartDTO.class)))
    @GetMapping("/{ticker}")
    public CompletableFuture<ChartDTO> getChart(
        @Parameter(description = "Ticker de la acción", example = "AAPL")
        @PathVariable String ticker,
        @Parameter(description = "Período de tiempo del gráfico", example = "1mo")
        @RequestParam(name = "period", defaultValue = "1mo")String period
    ) {
        return portfolioApiService.getFullChart(ticker, period);
    }
    

}
