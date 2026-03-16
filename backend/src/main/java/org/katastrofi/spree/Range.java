package org.katastrofi.spree;

public record Range<T extends Comparable<? super T>>(T start, T end) implements Comparable<T> {

    public static <T extends Comparable<? super T>> Range<T> starting(T start) {
        return new Range<>(start, null);
    }

    @Override
    public int compareTo(T o) {
        return this.start.compareTo(o);
    }
}
