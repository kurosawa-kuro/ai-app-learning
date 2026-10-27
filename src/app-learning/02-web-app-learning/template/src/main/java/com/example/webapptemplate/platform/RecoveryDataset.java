package com.example.webapptemplate.platform;
import java.util.List;
/** Explicit code-owned application tables, in foreign-key insertion order. */
public interface RecoveryDataset {
 record Table(String name, boolean images, boolean restore) {
  public Table { if (!name.matches("[a-z][a-z0-9_]*")) throw new IllegalArgumentException("Invalid table identifier"); }
 }
 List<Table> tables();
}
