import { Button } from "@/components/Button/Button";

export const ToggleShift = ({ isWorking, onToggle }) => {
  return (
    <Button
      variant={isWorking ? "danger" : "primary"}
      onClick={onToggle} // <-- Висит ли тут onClick?
    >
      {isWorking ? "Завершить смену" : "Начать смену"}
    </Button>
  );
};
