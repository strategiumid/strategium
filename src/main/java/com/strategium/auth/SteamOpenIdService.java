package com.strategium.auth;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SteamOpenIdService {

  private static final String STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";
  private static final Pattern STEAM_ID_PATTERN = Pattern.compile("https://steamcommunity\\.com/openid/id/(\\d+)");

  private final HttpClient httpClient = HttpClient.newHttpClient();
  private final String publicBaseUrl;

  public SteamOpenIdService(@Value("${strategium.public-base-url}") String publicBaseUrl) {
    this.publicBaseUrl = publicBaseUrl;
  }

  public String authenticationUrl() {
    String callback = publicBaseUrl + "/api/auth/steam/callback";
    return STEAM_OPENID_URL
        + "?openid.ns=" + enc("http://specs.openid.net/auth/2.0")
        + "&openid.mode=checkid_setup"
        + "&openid.return_to=" + enc(callback)
        + "&openid.realm=" + enc(publicBaseUrl)
        + "&openid.identity=" + enc("http://specs.openid.net/auth/2.0/identifier_select")
        + "&openid.claimed_id=" + enc("http://specs.openid.net/auth/2.0/identifier_select");
  }

  public Optional<String> validateAndExtractSteamId(Map<String, String[]> queryParams) {
    String claimedId = first(queryParams, "openid.claimed_id").orElse("");
    Matcher matcher = STEAM_ID_PATTERN.matcher(claimedId);
    if (!matcher.matches()) {
      return Optional.empty();
    }

    try {
      String body = toValidationBody(queryParams);
      HttpRequest request = HttpRequest.newBuilder(URI.create(STEAM_OPENID_URL))
          .header("Content-Type", "application/x-www-form-urlencoded")
          .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
          .build();
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      if (response.statusCode() < 400 && response.body().contains("is_valid:true")) {
        return Optional.of(matcher.group(1));
      }
    } catch (Exception ignored) {
      return Optional.empty();
    }
    return Optional.empty();
  }

  private static String toValidationBody(Map<String, String[]> queryParams) {
    StringBuilder body = new StringBuilder();
    queryParams.forEach((key, values) -> {
      if (!key.startsWith("openid.")) {
        return;
      }
      append(body, key, key.equals("openid.mode") ? "check_authentication" : first(values));
    });
    if (!queryParams.containsKey("openid.mode")) {
      append(body, "openid.mode", "check_authentication");
    }
    return body.toString();
  }

  private static Optional<String> first(Map<String, String[]> params, String key) {
    String[] values = params.get(key);
    return values == null || values.length == 0 ? Optional.empty() : Optional.ofNullable(values[0]);
  }

  private static String first(String[] values) {
    return values == null || values.length == 0 || values[0] == null ? "" : values[0];
  }

  private static void append(StringBuilder body, String key, String value) {
    if (!body.isEmpty()) {
      body.append('&');
    }
    body.append(enc(key)).append('=').append(enc(value));
  }

  private static String enc(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }
}
