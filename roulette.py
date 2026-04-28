import random


class Roulette:
    def __init__(self, name, options, remove_on_spin=True):
        self.name = name
        self.options = options
        self.remove_on_spin = remove_on_spin

    def spin(self):
        if not self.options:
            print(f"La ruleta '{self.name}' está vacía.")
            return None

        result = random.choice(self.options)

        if self.remove_on_spin:
            self.options.remove(result)

        return result

    def show_options(self):
        print(f"\nOpciones disponibles en la ruleta '{self.name}':")
        for option in self.options:
            print(f"- {option}")

    def remaining_options(self):
        return len(self.options)

    def is_empty(self):
        return len(self.options) == 0

    def __str__(self):
        mode = "Sin repetición" if self.remove_on_spin else "Con repetición"
        return f"Ruleta: {self.name} | Opciones: {len(self.options)} | Modo: {mode}"