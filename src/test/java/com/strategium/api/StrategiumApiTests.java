package com.strategium.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class StrategiumApiTests {

  @Autowired
  private MockMvc mockMvc;

  @Test
  void newsEndpointReturnsSeededItems() throws Exception {
    mockMvc.perform(get("/api/news"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].title").exists());
  }

  @Test
  void authenticatedUserCanSaveDivisionTemplate() throws Exception {
    MvcResult login = mockMvc.perform(post("/api/auth/dev-login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"displayName\":\"Tester\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.authenticated").value(true))
        .andReturn();

    HttpSession session = login.getRequest().getSession(false);
    String payload = """
        {
          "name": "Infantry template",
          "lineSlots": ["infantry", "infantry", "artillery", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
          "supportSlots": ["eng", "recon", null, null, null]
        }
        """;

    mockMvc.perform(post("/api/division-templates")
            .session((org.springframework.mock.web.MockHttpSession) session)
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.stats.combatWidth").value(7))
        .andExpect(jsonPath("$.stats.battalionCount").value(3));
  }
}
