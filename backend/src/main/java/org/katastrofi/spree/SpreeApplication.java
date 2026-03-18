package org.katastrofi.spree;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestClient;

@SpringBootApplication
public class SpreeApplication {

	static void main(String[] args) {
		SpringApplication.run(SpreeApplication.class, args);
	}

	@Bean
	RestClient restClient() {
		return RestClient.create();
	}

}
