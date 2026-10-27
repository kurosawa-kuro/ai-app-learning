package com.example.webapptemplate.platform.internal.adapter.persistence;

import com.example.webapptemplate.platform.UnitOfWork;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
@Component
public class SpringUnitOfWork implements UnitOfWork {
    private final TransactionTemplate transactions;
    public SpringUnitOfWork(TransactionTemplate transactions) { this.transactions = transactions; }
    public <T> T execute(Supplier<T> action) { return transactions.execute(status -> action.get()); }
}
