package com.strategium.auth;

import com.strategium.user.UserAccount;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public class AuthenticatedUser implements UserDetails {

  private final UUID id;
  private final String username;
  private final String displayName;
  private final String steamId;
  private final List<GrantedAuthority> authorities;

  public AuthenticatedUser(UserAccount user) {
    this.id = user.getId();
    this.username = user.getUsername();
    this.displayName = user.getDisplayName();
    this.steamId = user.getSteamId();
    this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
  }

  public UUID id() {
    return id;
  }

  public String displayName() {
    return displayName;
  }

  public String steamId() {
    return steamId;
  }

  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return authorities;
  }

  @Override
  public String getPassword() {
    return "";
  }

  @Override
  public String getUsername() {
    return username;
  }
}
