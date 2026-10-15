package com.pagareader.controller;

import com.pagareader.controller.investimenti.InvestimentiController;
import com.pagareader.entity.AppUser;
import com.pagareader.entity.investimenti.PatrimonioGiornaliero;
import com.pagareader.entity.investimenti.PortafoglioMovimento;
import com.pagareader.repository.investimenti.PatrimonioGiornalieroRepository;
import com.pagareader.repository.investimenti.PortafoglioMovimentoRepository;
import com.pagareader.service.investimenti.ExcelParserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvestimentiControllerTest {

    @Mock
    private ExcelParserService excelParserService;

    @Mock
    private PatrimonioGiornalieroRepository patrimonioRepository;

    @Mock
    private PortafoglioMovimentoRepository movimentiRepository;

    private InvestimentiController controller;
    private AppUser testUser;

    @BeforeEach
    void setUp() {
        controller = new InvestimentiController(excelParserService, patrimonioRepository, movimentiRepository);

        testUser = AppUser.builder()
                .id(1L)
                .email("test@example.com")
                .role(AppUser.Role.USER)
                .build();

        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(testUser, null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void testIncrementalUploadAddsOnlyNewDatesAndMovements() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "directa.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                new byte[]{1, 2, 3}
        );

        LocalDate existingDate = LocalDate.of(2025, 1, 10);
        LocalDate newDate = LocalDate.of(2025, 1, 11);

        PatrimonioGiornaliero existingPat = PatrimonioGiornaliero.builder()
                .dataValuta(existingDate)
                .patrimonio(1000.0)
                .build();

        PatrimonioGiornaliero newPat = PatrimonioGiornaliero.builder()
                .dataValuta(newDate)
                .patrimonio(1100.0)
                .build();

        PortafoglioMovimento existingMov = PortafoglioMovimento.builder()
                .dataValuta(existingDate)
                .descrizione("Acquisto ETF")
                .valore(-500.0)
                .isin("IE00BK5BQT80")
                .ticker("VWCE")
                .descrizioneTitolo("Vanguard All-World")
                .build();

        PortafoglioMovimento newMov = PortafoglioMovimento.builder()
                .dataValuta(newDate)
                .descrizione("Dividendo")
                .valore(50.0)
                .isin("IE00BK5BQT80")
                .ticker("VWCE")
                .descrizioneTitolo("Vanguard All-World")
                .build();

        ExcelParserService.ParseResult parseResult = new ExcelParserService.ParseResult();
        parseResult.patrimoni = List.of(existingPat, newPat);
        parseResult.movimenti = List.of(existingMov, newMov);

        when(excelParserService.parseDirectaExcel(any(), any())).thenReturn(parseResult);

        // In DB, existingDate and existingMov already exist
        when(patrimonioRepository.findDatesByUserId(1L)).thenReturn(Set.of(existingDate));
        when(movimentiRepository.findByUserIdOrderByDataValutaAsc(1L)).thenReturn(List.of(existingMov));

        when(patrimonioRepository.countByUserId(1L)).thenReturn(2L);
        when(movimentiRepository.countByUserId(1L)).thenReturn(2L);

        ResponseEntity<?> response = controller.uploadExcel(file);

        assertEquals(200, response.getStatusCode().value());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertEquals(1, body.get("patrimoniAggiunti"));
        assertEquals(1, body.get("movimentiAggiunti"));

        // Verify deleteByUserId was NEVER called
        verify(patrimonioRepository, never()).deleteByUserId(any());
        verify(movimentiRepository, never()).deleteByUserId(any());

        // Verify saveAll was called with ONLY the new records
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<PatrimonioGiornaliero>> patCaptor = ArgumentCaptor.forClass(List.class);
        verify(patrimonioRepository).saveAll(patCaptor.capture());
        assertEquals(1, patCaptor.getValue().size());
        assertEquals(newDate, patCaptor.getValue().get(0).getDataValuta());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<PortafoglioMovimento>> movCaptor = ArgumentCaptor.forClass(List.class);
        verify(movimentiRepository).saveAll(movCaptor.capture());
        assertEquals(1, movCaptor.getValue().size());
        assertEquals("Dividendo", movCaptor.getValue().get(0).getDescrizione());
    }

    @Test
    void testUploadWhenAllAlreadyImported() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "directa.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                new byte[]{1, 2, 3}
        );

        LocalDate existingDate = LocalDate.of(2025, 1, 10);
        PatrimonioGiornaliero existingPat = PatrimonioGiornaliero.builder()
                .dataValuta(existingDate)
                .patrimonio(1000.0)
                .build();

        PortafoglioMovimento existingMov = PortafoglioMovimento.builder()
                .dataValuta(existingDate)
                .descrizione("Acquisto ETF")
                .valore(-500.0)
                .isin("IE00BK5BQT80")
                .ticker("VWCE")
                .descrizioneTitolo("Vanguard All-World")
                .build();

        ExcelParserService.ParseResult parseResult = new ExcelParserService.ParseResult();
        parseResult.patrimoni = List.of(existingPat);
        parseResult.movimenti = List.of(existingMov);

        when(excelParserService.parseDirectaExcel(any(), any())).thenReturn(parseResult);
        when(patrimonioRepository.findDatesByUserId(1L)).thenReturn(Set.of(existingDate));
        when(movimentiRepository.findByUserIdOrderByDataValutaAsc(1L)).thenReturn(List.of(existingMov));

        ResponseEntity<?> response = controller.uploadExcel(file);

        assertEquals(200, response.getStatusCode().value());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertEquals(0, body.get("patrimoniAggiunti"));
        assertEquals(0, body.get("movimentiAggiunti"));

        // Neither saveAll nor deleteByUserId called for adding existing items
        verify(patrimonioRepository, never()).saveAll(any());
        verify(movimentiRepository, never()).saveAll(any());
        verify(patrimonioRepository, never()).deleteByUserId(any());
        verify(movimentiRepository, never()).deleteByUserId(any());
    }
}
