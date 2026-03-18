package org.katastrofi.spree.schedules;

import org.katastrofi.spree.routes.Transit;

import java.util.List;

public record Schedule(List<Transit> transits) {
}
