package com.strategium.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.strategium.user.UserAccount;
import com.strategium.user.UserAccountRepository;
import com.strategium.user.UserRole;
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

  @Autowired
  private UserAccountRepository userAccountRepository;

  @Test
  void newsEndpointReturnsSeededItems() throws Exception {
    mockMvc.perform(get("/api/news"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].title").exists());
  }

  @Test
  void newsEndpointSupportsSearch() throws Exception {
    mockMvc.perform(get("/api/news").param("q", "Stellaris"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].title").value("Stellaris — Open Beta Changelog"));
  }

  @Test
  void regularUserCannotCreateNews() throws Exception {
    HttpSession session = login("Regular");

    mockMvc.perform(post("/api/news")
            .session((org.springframework.mock.web.MockHttpSession) session)
            .contentType(MediaType.APPLICATION_JSON)
            .content(newsPayload()))
        .andExpect(status().isForbidden());
  }

  @Test
  void adminCanCreateNews() throws Exception {
    HttpSession session = login("Admin");
    UserAccount admin = userAccountRepository.findByUsername("dev:admin").orElseThrow();
    admin.setRole(UserRole.ADMIN);
    userAccountRepository.save(admin);

    mockMvc.perform(post("/api/news")
            .session((org.springframework.mock.web.MockHttpSession) session)
            .contentType(MediaType.APPLICATION_JSON)
            .content(newsPayload()))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.title").value("Test News"));
  }

  @Test
  void divisionUnitCatalogAndCalculatorArePublic() throws Exception {
    mockMvc.perform(get("/api/division-templates/units"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.lineBattalions[0].id").value("infantry"))
        .andExpect(jsonPath("$.supportCompanies[0].id").value("eng"));

    mockMvc.perform(post("/api/division-templates/calculate")
            .contentType(MediaType.APPLICATION_JSON)
            .content(divisionPayload()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.combatWidth").value(7))
        .andExpect(jsonPath("$.battalionCount").value(3));
  }

  @Test
  void steamGameCatalogIsPublic() throws Exception {
    mockMvc.perform(get("/api/steam/games"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].slug").value("hearts-of-iron-iv"))
        .andExpect(jsonPath("$[1].slug").value("crusader-kings-iii"))
        .andExpect(jsonPath("$[9].slug").value("everlasting-summer"));
  }

  @Test
  void steamAchievementsRequireLinkedSteamAccount() throws Exception {
    HttpSession session = login("Tester");

    mockMvc.perform(get("/api/steam/achievements")
            .session((org.springframework.mock.web.MockHttpSession) session))
        .andExpect(status().isBadRequest());
  }

  @Test
  void steamLeaderboardIsPublic() throws Exception {
    mockMvc.perform(get("/api/steam/leaderboard")
            .param("scope", "pdx")
            .param("sort", "achievements"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.scope").value("pdx"))
        .andExpect(jsonPath("$.sort").value("achievements"))
        .andExpect(jsonPath("$.entries").isArray());
  }

  @Test
  void steamStatsRefreshRequiresLinkedSteamAccount() throws Exception {
    HttpSession session = login("Tester");

    mockMvc.perform(post("/api/steam/stats/refresh")
            .session((org.springframework.mock.web.MockHttpSession) session))
        .andExpect(status().isBadRequest());
  }

  @Test
  void currentUserResponseIncludesVkLinkState() throws Exception {
    HttpSession session = login("Tester");

    mockMvc.perform(get("/api/me")
            .session((org.springframework.mock.web.MockHttpSession) session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.vkLinked").value(false));
  }

  @Test
  void vkOAuthStartRequiresConfiguration() throws Exception {
    HttpSession session = login("Tester");

    mockMvc.perform(get("/api/auth/vk/start")
            .session((org.springframework.mock.web.MockHttpSession) session))
        .andExpect(status().isServiceUnavailable());
  }

  @Test
  void vkPostActionsRequireLinkedVkAccount() throws Exception {
    HttpSession session = login("Tester");

    mockMvc.perform(post("/api/feed/vk/posts/-1_1/like")
            .session((org.springframework.mock.web.MockHttpSession) session))
        .andExpect(status().isBadRequest());

    mockMvc.perform(post("/api/feed/vk/posts/-1_1/comments")
            .session((org.springframework.mock.web.MockHttpSession) session)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"message\":\"\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void authenticatedUserCanUpdateProfile() throws Exception {
    HttpSession session = login("Old Name");

    mockMvc.perform(put("/api/me")
            .session((org.springframework.mock.web.MockHttpSession) session)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"displayName\":\"New Name\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.displayName").value("New Name"));
  }

  @Test
  void authenticatedUserCanSaveDivisionTemplate() throws Exception {
    HttpSession session = login("Tester");

    mockMvc.perform(post("/api/division-templates")
            .session((org.springframework.mock.web.MockHttpSession) session)
            .contentType(MediaType.APPLICATION_JSON)
            .content(divisionPayload()))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.stats.combatWidth").value(7))
        .andExpect(jsonPath("$.stats.battalionCount").value(3));
  }

  private HttpSession login(String displayName) throws Exception {
    MvcResult login = mockMvc.perform(post("/api/auth/dev-login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"displayName\":\"" + displayName + "\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.authenticated").value(true))
        .andReturn();
    return login.getRequest().getSession(false);
  }

  private static String divisionPayload() {
    return """
        {
          "name": "Infantry template",
          "lineSlots": ["infantry", "infantry", "artillery", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
          "supportSlots": ["eng", "recon", null, null, null]
        }
        """;
  }

  private static String newsPayload() {
    return """
        {
          "title": "Test News",
          "text": "Backend news CRUD test",
          "tag": "test",
          "sourceName": "Strategium",
          "sourceUrl": "https://strategium.example/news",
          "publishedAt": "2026-04-28"
        }
        """;
  }
}
