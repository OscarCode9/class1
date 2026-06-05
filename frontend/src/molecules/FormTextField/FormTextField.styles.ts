import { TextField } from "@mui/material";
import { styled } from "@mui/material/styles";

export const StyledTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    backgroundColor: "rgba(255, 250, 244, 0.9)",
    borderRadius: 18,
    transition: "transform 160ms ease, box-shadow 160ms ease",
    "& fieldset": {
      borderColor: "rgba(35, 22, 15, 0.12)",
    },
    "&:hover": {
      transform: "translateY(-1px)",
      boxShadow: "0 10px 20px rgba(18, 76, 90, 0.08)",
    },
    "&.Mui-focused fieldset": {
      borderWidth: 2,
      borderColor: theme.palette.secondary.main,
    },
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: theme.palette.secondary.main,
  },
  "& .MuiFormHelperText-root": {
    marginLeft: theme.spacing(0.5),
  },
}));
